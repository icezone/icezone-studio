import { registerVideoProvider } from './registry'
import { klingProvider } from './providers/kling'
import { sora2Provider } from './providers/sora2'
import { veoProvider, veoFastProvider } from './providers/veo'

// Register all video providers
registerVideoProvider(klingProvider)
registerVideoProvider(sora2Provider)
registerVideoProvider(veoProvider)
registerVideoProvider(veoFastProvider)

export { registerVideoProvider, getVideoProvider, getAllVideoProviders } from './registry'
export type { VideoProvider, VideoGenerateRequest, VideoJobPollResult, VideoJobStatus } from './types'
