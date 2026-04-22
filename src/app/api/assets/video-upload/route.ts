import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { projectId?: string; fileName?: string; mimeType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { projectId, fileName, mimeType } = body
  if (!projectId || !fileName || !mimeType) {
    return NextResponse.json({ error: 'projectId, fileName, mimeType required' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: `mime type ${mimeType} not allowed` }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) {
    return NextResponse.json({ error: 'project not found or not owned' }, { status: 403 })
  }

  const ext = EXT_BY_MIME[mimeType]
  const objectPath = `${projectId}/${randomUUID()}.${ext}`

  const { data: signed, error } = await supabase.storage
    .from('project-videos')
    .createSignedUploadUrl(objectPath)

  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? 'failed to sign' }, { status: 500 })
  }

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const videoUrl = `${publicBase}/storage/v1/object/sign/project-videos/${signed.path}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  return NextResponse.json({
    uploadUrl: signed.signedUrl,
    videoUrl,
    expiresAt,
  })
}
