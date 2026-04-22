/**
 * OpenAI-compat 协议统一适配器
 *
 * 用于用户自定义的 OpenAI 兼容端点(如 OpenRouter / OhMyGPT / 各类 LLM 中转站),
 * 以及支持 OpenAI-compat 协议的图片/视频 endpoint。
 *
 * 当前实现范围(M1):
 *   - listOpenAICompatModels:GET /v1/models(供 M2 能力探测)
 *   - createOpenAICompatProvider → chatComplete:POST /v1/chat/completions
 *
 * 非 M1 范围:
 *   - POST /v1/images/generations(M3 按需扩)
 *   - 其他厂商专有扩展字段(按需适配)
 */

import type { AIProvider } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: false; // M1 仅同步;流式在后续 milestone 接入
}

export interface ChatCompletionResult {
  content: string;
  /** 原始响应,便于上层获取 usage / finish_reason */
  raw: unknown;
}

/**
 * 带 chatComplete 扩展的 AIProvider(OpenAI-compat 特有)。
 * 非 OpenAI-compat 的内置 provider 不实现 chatComplete。
 */
export interface OpenAICompatProvider extends AIProvider {
  chatComplete?: (request: ChatCompletionRequest) => Promise<ChatCompletionResult>;
}

/**
 * 规范化 baseUrl:去掉结尾斜杠。
 */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * GET /v1/models — 列出该 key 能访问的模型 id。
 * 错误(含 401/429/5xx)会抛出 Error("openaiCompat list-models <status>: <body>"),
 * 由调用方决定如何分类(M2 能力探测会据此标记 key 状态)。
 */
export async function listOpenAICompatModels(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`openaiCompat list-models ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  const list = data.data ?? [];
  return list.map((m) => m.id).filter((id): id is string => typeof id === 'string');
}

/**
 * 创建一个 OpenAI-compat provider 实例。
 *
 * 注意:本工厂为每次路由调用 **动态构造** 一个实例(不缓存),因为:
 *   - apiKey 来自每请求解密,不适合长期持有
 *   - baseUrl 可能因用户更新而变
 */
export function createOpenAICompatProvider(opts: {
  id: string;
  baseUrl: string;
  apiKey: string;
}): OpenAICompatProvider {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);

  return {
    id: opts.id,
    name: opts.id,

    async chatComplete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const url = `${baseUrl}/chat/completions`;

      const body: Record<string, unknown> = {
        model: request.model,
        messages: request.messages,
      };
      if (request.temperature !== undefined) body.temperature = request.temperature;
      if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        throw new Error(
          `openaiCompat chat-completions ${response.status}: ${errBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      return { content, raw: data };
    },
  };
}
