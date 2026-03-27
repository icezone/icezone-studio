import { NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { z } from 'zod';

const completeSchema = z.object({
  projectId: z.string().min(1),
  storagePath: z.string().min(1),
  publicUrl: z.string().url(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
});

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

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { projectId, storagePath, publicUrl, fileName, fileSize, mimeType } = parsed.data;

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

  // Register asset in project_assets table
  const { data: asset, error: assetError } = await supabase
    .from('project_assets')
    .insert({
      project_id: projectId,
      user_id: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select('id, public_url')
    .single();

  if (assetError) {
    console.error('[assets/complete] Failed to register asset:', assetError);
    return NextResponse.json({ error: 'Failed to register asset' }, { status: 500 });
  }

  return NextResponse.json({
    assetId: asset.id,
    imageUrl: asset.public_url,
  });
}
