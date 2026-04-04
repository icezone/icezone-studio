import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { analyzeNovel } from '@/server/ai/analysis/novelAnalysisService'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { text, language, maxScenes, sceneGranularity } = body

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required and must be a string' }, { status: 400 })
  }

  try {
    const result = await analyzeNovel({
      text: text as string,
      language: (language as 'auto' | 'zh' | 'en') || 'auto',
      maxScenes: typeof maxScenes === 'number' ? maxScenes : undefined,
      sceneGranularity: (sceneGranularity as 'coarse' | 'medium' | 'fine') || undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    // Return 400 for validation errors, 500 for everything else
    const isValidationError = message.includes('10,000') || message.includes('required')
    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}
