import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { analyzeShot } from '@/server/ai/analysis/shotAnalysisService'

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

  const { imageUrl, additionalFrameUrls, language } = body

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json(
      { error: 'imageUrl is required and must be a string' },
      { status: 400 }
    )
  }

  // Validate additionalFrameUrls if provided
  if (additionalFrameUrls !== undefined) {
    if (!Array.isArray(additionalFrameUrls)) {
      return NextResponse.json(
        { error: 'additionalFrameUrls must be an array of strings' },
        { status: 400 }
      )
    }
    if (additionalFrameUrls.some((url: unknown) => typeof url !== 'string')) {
      return NextResponse.json(
        { error: 'All additionalFrameUrls must be strings' },
        { status: 400 }
      )
    }
    if (additionalFrameUrls.length > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 additional frames allowed' },
        { status: 400 }
      )
    }
  }

  // Validate language
  const resolvedLanguage = language === 'zh' || language === 'en' ? language : 'en'

  try {
    const result = await analyzeShot({
      imageUrl: imageUrl as string,
      additionalFrameUrls: (additionalFrameUrls as string[] | undefined) || undefined,
      language: resolvedLanguage,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Shot analysis failed'
    const isValidationError = message.includes('required')
    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}
