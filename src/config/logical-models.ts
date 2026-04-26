export type ModelScenario = 'image' | 'video' | 'text' | 'analysis'

export interface LogicalModelEntry {
  id: string           // 路由引擎使用的 ID，e.g. 'nano-banana-2'
  displayName: string  // 用户看到的名称，e.g. 'Nano Banana 2'
  scenario: ModelScenario
}

export const LOGICAL_MODELS: readonly LogicalModelEntry[] = [
  // 图片模型
  { id: 'nano-banana-2',    displayName: 'Nano Banana 2',    scenario: 'image' },
  { id: 'nano-banana-pro',  displayName: 'Nano Banana Pro',  scenario: 'image' },
  { id: 'grok-image',       displayName: 'Grok Image',       scenario: 'image' },
  { id: 'gemini-3.1-flash', displayName: 'Gemini 3.1 Flash', scenario: 'image' },
  // 视频模型
  { id: 'kling-3.0',  displayName: 'Kling 3.0',  scenario: 'video' },
  { id: 'sora2-pro',  displayName: 'Sora2 Pro',  scenario: 'video' },
  { id: 'veo-3',      displayName: 'Veo 3',      scenario: 'video' },
]

export function listLogicalModels(scenario?: ModelScenario): LogicalModelEntry[] {
  if (!scenario) return [...LOGICAL_MODELS]
  return LOGICAL_MODELS.filter((m) => m.scenario === scenario)
}

export function getLogicalModel(id: string): LogicalModelEntry | undefined {
  return LOGICAL_MODELS.find((m) => m.id === id)
}

/**
 * 将 logicalModelId 映射到 canvas 内部 provider/model ID（用于参数控件显示）。
 * 优先级：kie > fal > grsai > ppio，取第一个注册过的 canvas 模型。
 */
export function mapToCanvasModelId(
  logicalModelId: string,
  availableCanvasIds: readonly string[],
): string | null {
  const priority = ['kie', 'fal', 'grsai', 'ppio']
  for (const p of priority) {
    const candidate = `${p}/${logicalModelId}`
    if (availableCanvasIds.includes(candidate)) return candidate
  }
  // 部分模型直接是 provider/model 格式 ID，如 ppio/gemini-3.1-flash
  const direct = availableCanvasIds.find((id) => id.endsWith(`/${logicalModelId}`))
  return direct ?? null
}
