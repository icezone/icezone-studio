import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthUser: vi.fn(),
}));

const mockUser = { id: 'user-123', email: 'test@example.com' };

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const storageMock = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/file.png' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://supabase.co/storage/v1/object/public/project-assets/path.png' },
    }),
  };

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'project-123' }, error: null }),
      };
    }
    if (table === 'project_assets') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return {};
  });

  return {
    from: fromMock,
    storage: storageMock,
    ...overrides,
  };
}

describe('POST /api/assets/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { createClient, getAuthUser } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const { POST } = await import('../../src/app/api/assets/upload/route');

    const formData = new FormData();
    formData.append('projectId', 'project-123');
    formData.append(
      'file',
      new File(['test'], 'test.png', { type: 'image/png' })
    );

    const response = await POST(new Request('http://localhost/api/assets/upload', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('should return 400 when file is missing', async () => {
    const { createClient, getAuthUser } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);
    vi.mocked(getAuthUser).mockResolvedValue(mockUser as never);

    const { POST } = await import('../../src/app/api/assets/upload/route');

    const formData = new FormData();
    formData.append('projectId', 'project-123');

    const response = await POST(new Request('http://localhost/api/assets/upload', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('file');
  });

  it('should return 400 for unsupported file type', async () => {
    const { createClient, getAuthUser } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);
    vi.mocked(getAuthUser).mockResolvedValue(mockUser as never);

    const { POST } = await import('../../src/app/api/assets/upload/route');

    const formData = new FormData();
    formData.append('projectId', 'project-123');
    formData.append(
      'file',
      new File(['test'], 'test.pdf', { type: 'application/pdf' })
    );

    const response = await POST(new Request('http://localhost/api/assets/upload', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('Unsupported file type');
  });

  it('should upload file and return imageUrl on success', async () => {
    const { createClient, getAuthUser } = await import('@/lib/supabase/server');
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(getAuthUser).mockResolvedValue(mockUser as never);

    const { POST } = await import('../../src/app/api/assets/upload/route');

    const formData = new FormData();
    formData.append('projectId', 'project-123');
    formData.append(
      'file',
      new File([new Uint8Array([137, 80, 78, 71])], 'image.png', { type: 'image/png' })
    );

    const response = await POST(new Request('http://localhost/api/assets/upload', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(200);
    const body = await response.json() as { imageUrl: string };
    expect(body.imageUrl).toContain('supabase.co');
  });
});
