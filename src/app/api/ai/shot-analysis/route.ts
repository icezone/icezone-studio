import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeShot } from '@/server/ai/analysis/shotAnalysisService'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'

const VALID_LANG = new Set(['zh', 'en'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { imageUrl?: string; additionalFrameUrls?: string[]; language?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }
  if (!body.language || !VALID_LANG.has(body.language)) {
    return NextResponse.json({ error: 'language must be zh or en' }, { status: 400 })
  }

  try {
    const result = await analyzeShot({
      imageUrl: body.imageUrl,
      additionalFrameUrls: body.additionalFrameUrls,
      language: body.language as 'zh' | 'en',
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
