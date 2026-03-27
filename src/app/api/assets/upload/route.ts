import { NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/tiff',
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const projectId = formData.get('projectId');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large: ${file.size} bytes. Max: ${MAX_FILE_SIZE_BYTES} bytes` },
      { status: 400 }
    );
  }

  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
  }

  // Generate storage path
  const ext = file.name.split('.').pop() ?? 'png';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const storagePath = `${user.id}/${projectId}/${timestamp}_${randomSuffix}.${ext}`;

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('project-assets')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('[assets/upload] Storage upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('project-assets')
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  // Register asset metadata in project_assets table
  const { error: assetError } = await supabase.from('project_assets').insert({
    project_id: projectId,
    user_id: user.id,
    storage_path: storagePath,
    public_url: imageUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  });

  if (assetError) {
    console.warn('[assets/upload] Failed to register asset metadata:', assetError);
    // Non-fatal: asset is uploaded, just metadata registration failed
  }

  return NextResponse.json({
    imageUrl,
    previewImageUrl: imageUrl,
    storagePath,
  });
}
