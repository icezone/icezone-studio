import { NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { z } from 'zod';

const uploadUrlSchema = z.object({
  imageUrl: z.string().min(1),
  projectId: z.string().min(1),
});

const MAX_FETCH_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { imageUrl, projectId } = parsed.data;

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

  // If it's already a Supabase storage URL, return as-is
  const supabaseUrlPattern = /supabase\.co\/storage/;
  if (supabaseUrlPattern.test(imageUrl) && !imageUrl.startsWith('data:')) {
    return NextResponse.json({ imageUrl, previewImageUrl: imageUrl });
  }

  // Fetch the image
  let imageBuffer: ArrayBuffer;
  let mimeType: string;

  if (imageUrl.startsWith('data:')) {
    // Parse data URL
    const [header, base64Data] = imageUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    mimeType = mimeMatch?.[1] ?? 'image/png';
    const binaryStr = atob(base64Data);
    imageBuffer = new ArrayBuffer(binaryStr.length);
    const view = new Uint8Array(imageBuffer);
    for (let i = 0; i < binaryStr.length; i++) {
      view[i] = binaryStr.charCodeAt(i);
    }
  } else {
    // Fetch remote URL
    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(imageUrl);
    } catch (error) {
      return NextResponse.json({ error: `Failed to fetch image: ${String(error)}` }, { status: 400 });
    }

    if (!fetchResponse.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${fetchResponse.status}` }, { status: 400 });
    }

    mimeType = fetchResponse.headers.get('content-type') ?? 'image/jpeg';
    mimeType = mimeType.split(';')[0].trim();

    imageBuffer = await fetchResponse.arrayBuffer();
    if (imageBuffer.byteLength > MAX_FETCH_SIZE) {
      return NextResponse.json({ error: 'Image too large to store' }, { status: 400 });
    }
  }

  // Generate storage path
  const ext = mimeType.split('/')[1] ?? 'png';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const storagePath = `${user.id}/${projectId}/${timestamp}_${randomSuffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('project-assets')
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('[assets/upload-url] Storage upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to store image' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from('project-assets')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Register asset metadata
  await supabase.from('project_assets').insert({
    project_id: projectId,
    user_id: user.id,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: mimeType,
    file_size: imageBuffer.byteLength,
  });

  return NextResponse.json({
    imageUrl: publicUrl,
    previewImageUrl: publicUrl,
    storagePath,
  });
}
