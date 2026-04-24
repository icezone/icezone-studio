/**
 * 静态价格表 — 每个逻辑模型单次调用的估算成本(cents)。
 *
 * 数据来源:provider 官网报价的常用档位平均值。
 * 维护方式:Claude Code 远程提交 PR 更新。
 * 用途:路由引擎排序时的成本维度输入(src/features/routing/,M3)。
 */

export type PricingScenario = 'image' | 'video' | 'text' | 'analysis';

export interface PriceEntry {
  priceCents: number;
  scenario: PricingScenario;
  /** 人类可读的备注(计费口径,如 "per 1M input tokens","per image") */
  unit?: string;
}

/**
 * 价格条目:key 为 logical model id(与 canvas models registry 一致)。
 * 初版覆盖主要图片/视频/LLM 模型;缺失的模型返回 0(成本维度中性)。
 */
export const PRICING_TABLE: Readonly<Record<string, PriceEntry>> = {
  // 图片(按张)
  'nano-banana-2': { priceCents: 4, scenario: 'image', unit: 'per image' },
  'nano-banana-pro': { priceCents: 20, scenario: 'image', unit: 'per image' },
  'grok-image': { priceCents: 7, scenario: 'image', unit: 'per image' },
  'gemini-3.1-flash': { priceCents: 3, scenario: 'image', unit: 'per image' },

  // 视频(按秒的平均值 × 典型 5s)
  'kling-3.0': { priceCents: 75, scenario: 'video', unit: 'per 5s clip' },
  'sora2-pro': { priceCents: 150, scenario: 'video', unit: 'per 5s clip' },
  'veo-3': { priceCents: 100, scenario: 'video', unit: 'per 5s clip' },
  'seedance': { priceCents: 60, scenario: 'video', unit: 'per 5s clip' },

  // LLM(按 1M input tokens 的估算,M3 实际路由时会按 token 数再计算)
  'gemini-2.5-flash': { priceCents: 8, scenario: 'text', unit: 'per 1M input tokens' },
  'claude-3.5-sonnet': { priceCents: 300, scenario: 'text', unit: 'per 1M input tokens' },
  'gpt-4o': { priceCents: 250, scenario: 'text', unit: 'per 1M input tokens' },

  // 分析(Gemini Vision)
  'gemini-vision': { priceCents: 5, scenario: 'analysis', unit: 'per analysis' },
};

/**
 * 查询某个逻辑模型的单次成本估算(cents)。
 * 未知模型返回 0(在排序中被视作"成本中性",不影响相对排名)。
 */
export function getModelPriceCents(logicalModelId: string): number {
  return PRICING_TABLE[logicalModelId]?.priceCents ?? 0;
}
