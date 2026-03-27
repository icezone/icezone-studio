import { NextResponse } from 'next/server'
import { getAllProviders } from '@/server/ai/registry'

// Ensure providers are registered
import '@/server/ai/index'

export async function GET() {
  const providers = getAllProviders()

  const models = providers.map((provider) => ({
    providerId: provider.id,
    providerName: provider.name,
    supportsSync: typeof provider.generate === 'function',
    supportsAsync: typeof provider.submitJob === 'function',
  }))

  return NextResponse.json({ models })
}
