import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { detectScenes } from '@/server/video/analysis/sceneDetector'
import { extractKeyframes } from '@/server/video/analysis/frameExtractor'
import { uploadKeyframes } from '@/server/video/analysis/keyframeStorage'

const HARD_TIMEOUT_MS = 280_000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: {
    videoUrl?: string
    projectId?: string
    sensitivityThreshold?: number
    minSceneDurationMs?: number
    maxKeyframes?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { videoUrl, projectId } = body
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) {
    return NextResponse.json({ error: 'project not found or not owned' }, { status: 403 })
  }

  const analysisId = randomUUID()

  const work = (async () => {
    const scenes = await detectScenes(videoUrl, {
      sensitivityThreshold: body.sensitivityThreshold,
      minSceneDurationMs: body.minSceneDurationMs,
      maxKeyframes: body.maxKeyframes,
    })

    const timestamps = scenes.map((s) => s.keyframeTimestampMs)
    const frames = await extractKeyframes(videoUrl, timestamps)

    const keyframes = frames.map((f) => ({
      timestampMs: f.timestampMs,
      buffer: bufferFromDataUri(f.imageData),
    }))

    const urls = await uploadKeyframes({ projectId, analysisId, keyframes })

    return scenes.map((scene, i) => ({
      startTimeMs: scene.startTimeMs,
      endTimeMs: scene.endTimeMs,
      keyframeUrl: urls[i] ?? '',
      confidence: scene.confidence,
    }))
  })()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('analyze timeout')), HARD_TIMEOUT_MS),
  )

  try {
    const scenesOut = await Promise.race([work, timeout])
    return NextResponse.json({
      analysisId,
      scenes: scenesOut,
      totalDurationMs: scenesOut.length ? scenesOut[scenesOut.length - 1].endTimeMs : 0,
      fps: 24,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout')) {
      return NextResponse.json(
        { error: 'video too long for MVP sync mode (cap ~2 min / ~20 keyframes)' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function bufferFromDataUri(dataUri: string): Buffer {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/)
  if (!match) throw new Error('invalid data URI from frameExtractor')
  return Buffer.from(match[1], 'base64')
}
