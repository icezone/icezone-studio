import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  createOpenAICompatProvider,
  listOpenAICompatModels,
  type ChatCompletionRequest,
} from './openaiCompat';

describe('openaiCompat', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listOpenAICompatModels', () => {
    it('应该从 /v1/models 解析出模型 id 列表', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4o', object: 'model' },
            { id: 'claude-3.5-sonnet', object: 'model' },
          ],
        }),
      });

      const models = await listOpenAICompatModels(
        'https://api.example.com/v1',
        'sk-test'
      );

      expect(models).toEqual(['gpt-4o', 'claude-3.5-sonnet']);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
          }),
        })
      );
    });

    it('应该正确处理末尾带斜杠的 baseUrl', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await listOpenAICompatModels('https://api.example.com/v1/', 'sk-test');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.anything()
      );
    });

    it('HTTP 401 应该抛出带状态码的错误', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid key',
      });

      await expect(
        listOpenAICompatModels('https://api.example.com/v1', 'bad-key')
      ).rejects.toThrow(/401/);
    });

    it('data 为空时返回空数组', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const models = await listOpenAICompatModels(
        'https://api.example.com/v1',
        'sk-test'
      );
      expect(models).toEqual([]);
    });
  });

  describe('createOpenAICompatProvider', () => {
    it('factory 返回带 id/name 的 AIProvider', () => {
      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      expect(provider.id).toBe('custom:abc');
      expect(provider.name).toBe('custom:abc');
      expect(typeof provider.chatComplete).toBe('function');
    });

    it('chatComplete 调用正确的 endpoint 并解析第一条 message', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { role: 'assistant', content: 'Hello!' } },
          ],
        }),
      });

      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      const req: ChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };
      const result = await provider.chatComplete!(req);

      expect(result.content).toBe('Hello!');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('chatComplete 遇到 HTTP 500 抛错', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'oops',
      });

      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      await expect(
        provider.chatComplete!({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow(/500/);
    });
  });
});
