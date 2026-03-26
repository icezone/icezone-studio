import type { VideoProvider } from './types'

const providers = new Map<string, VideoProvider>()

export function registerVideoProvider(provider: VideoProvider): void {
  providers.set(provider.id, provider)
}

export function getVideoProvider(id: string): VideoProvider | undefined {
  return providers.get(id)
}

export function getAllVideoProviders(): VideoProvider[] {
  return Array.from(providers.values())
}
