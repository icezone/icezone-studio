/**
 * 推荐聚合器清单 — Fallback 快照
 *
 * 远程 manifest 存在 Supabase Storage(M4 接入),前端每 24h 刷新一次本地缓存。
 * 本文件为打包进 bundle 的兜底快照,在:
 *   1) 首次打开应用、尚无本地缓存
 *   2) 远程拉取失败
 * 两种情况下使用,保证 Onboarding Wizard 始终有可用数据。
 *
 * 维护:Claude Code 远程 PR 更新;每次更新后 version 字段递增(YYYY.MM.DD 格式)。
 */

export type ProviderProtocol = 'native' | 'openai-compat';
export type ScenarioCategory = 'llm' | 'image' | 'video' | 'analysis';
export type PriceTier = 'low' | 'mid' | 'high';

export interface AggregatorDescriptor {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl?: string;
  getKeyUrl: string;
  categories: readonly ScenarioCategory[];
  priceTier: Partial<Record<ScenarioCategory, PriceTier>>;
  /** 0–100 的经验可靠度基线,会被用户本地历史覆盖(M3) */
  reliabilityScore: number;
  recommended: boolean;
  recommendBundles: readonly string[];
  description?: string;
}

export interface AggregatorManifest {
  version: string;
  updatedAt: string;
  aggregators: readonly AggregatorDescriptor[];
}

/**
 * 打包快照 — M1 初版。
 */
export const FALLBACK_AGGREGATOR_MANIFEST: AggregatorManifest = {
  version: '2026.04.21',
  updatedAt: '2026-04-21T00:00:00Z',
  aggregators: [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      protocol: 'openai-compat',
      baseUrl: 'https://openrouter.ai/api/v1',
      getKeyUrl: 'https://openrouter.ai/keys',
      categories: ['llm'],
      priceTier: { llm: 'mid' },
      reliabilityScore: 95,
      recommended: true,
      recommendBundles: ['starter', 'llm-heavy'],
      description: '全球主流 LLM 聚合(Claude / GPT / Gemini 等)',
    },
    {
      id: 'kie',
      name: 'KIE 中转',
      protocol: 'native',
      getKeyUrl: 'https://kieai.erp.mofasuan.com',
      categories: ['image', 'video'],
      priceTier: { image: 'low', video: 'mid' },
      reliabilityScore: 88,
      recommended: true,
      recommendBundles: ['starter'],
      description: 'Nano Banana / 视频模型价格友好',
    },
    {
      id: 'fal',
      name: 'fal.ai',
      protocol: 'native',
      getKeyUrl: 'https://fal.ai/dashboard/keys',
      categories: ['image'],
      priceTier: { image: 'mid' },
      reliabilityScore: 92,
      recommended: false,
      recommendBundles: [],
      description: '图片模型官方渠道',
    },
    {
      id: 'running-hub',
      name: 'RunningHub',
      protocol: 'native',
      getKeyUrl: 'https://runninghub.ai',
      categories: ['video'],
      priceTier: { video: 'low' },
      reliabilityScore: 80,
      recommended: true,
      recommendBundles: ['video-focused'],
      description: '视频生成中转,价格低廉',
    },
  ],
};

export function listRecommendedAggregators(): readonly AggregatorDescriptor[] {
  return FALLBACK_AGGREGATOR_MANIFEST.aggregators.filter((a) => a.recommended);
}

export function getAggregatorById(id: string): AggregatorDescriptor | undefined {
  return FALLBACK_AGGREGATOR_MANIFEST.aggregators.find((a) => a.id === id);
}
