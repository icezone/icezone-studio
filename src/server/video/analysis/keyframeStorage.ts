import { createClient } from '@/lib/supabase/server'

export interface KeyframeUpload {
  timestampMs: number
  buffer: Buffer
}

export interface UploadKeyframesParams {
  projectId: string
  analysisId: string
  keyframes: KeyframeUpload[]
}

const CONCURRENCY = 5
const BUCKET = 'project-keyframes'
const SIGN_URL_TTL_SEC = 60 * 60 * 24 * 30 // 30 days

export async function uploadKeyframes(params: UploadKeyframesParams): Promise<string[]> {
  const supabase = await createClient()
  const bucket = supabase.storage.from(BUCKET)

  async function uploadOne(kf: KeyframeUpload): Promise<string> {
    const path = `${params.projectId}/${params.analysisId}/frame-${kf.timestampMs}.jpg`
    const { error } = await bucket.upload(path, kf.buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) throw new Error(`keyframe upload failed: ${error.message}`)

    const { data: signed, error: signErr } = await bucket.createSignedUrl(path, SIGN_URL_TTL_SEC)
    if (signErr || !signed) {
      throw new Error(`keyframe sign failed: ${signErr?.message ?? 'unknown'}`)
    }
    return signed.signedUrl
  }

  const results: string[] = new Array(params.keyframes.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= params.keyframes.length) return
      results[i] = await uploadOne(params.keyframes[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, params.keyframes.length) }, worker),
  )
  return results
}
