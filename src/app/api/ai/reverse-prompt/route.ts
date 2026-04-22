import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { generateReversePrompt } from '@/server/ai/analysis/reversePromptService'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'
import type { ReversePromptStyle } from '@/server/ai/analysis/types'

const VALID_STYLES: ReversePromptStyle[] = ['generic', 'chinese']

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

  const { imageUrl, style, additionalContext } = body

  // Validate imageUrl
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'imageUrl is required and must be a string' }, { status: 400 })
  }

  // Validate style
  const resolvedStyle = (typeof style === 'string' && VALID_STYLES.includes(style as ReversePromptStyle))
    ? (style as ReversePromptStyle)
    : 'generic'

  // Validate additionalContext
  const resolvedContext = typeof additionalContext === 'string' && additionalContext.trim().length > 0
    ? additionalContext.trim().slice(0, 500)
    : undefined

  try {
    const result = await generateReversePrompt({
      imageUrl: imageUrl as string,
      style: resolvedStyle,
      additionalContext: resolvedContext,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const message = error instanceof Error ? error.message : 'Reverse prompt generation failed'
    const isValidationError = message.includes('required')
    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}
