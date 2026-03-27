// @vitest-environment node
import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { POST } from '../../src/app/api/image/crop/route'
import { NextRequest } from 'next/server'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .png()
    .toBuffer()
}

function createFormDataRequest(formData: FormData): NextRequest {
  const request = new Request('http://localhost/api/image/crop', {
    method: 'POST',
    body: formData,
  })
  return new NextRequest(request)
}

describe('POST /api/image/crop', () => {
  it('should crop an image to the specified region', async () => {
    const imgBuf = await createTestImage(400, 300)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('x', '0')
    formData.append('y', '0')
    formData.append('width', '200')
    formData.append('height', '150')

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')

    const arrayBuf = await response.arrayBuffer()
    const resultBuf = Buffer.from(arrayBuf)
    const meta = await sharp(resultBuf).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })

  it('should return 400 for missing crop parameters', async () => {
    const imgBuf = await createTestImage(400, 300)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    // Missing x, y, width, height

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(400)
  })

  it('should return 400 for negative coordinates', async () => {
    const imgBuf = await createTestImage(400, 300)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('x', '-10')
    formData.append('y', '0')
    formData.append('width', '200')
    formData.append('height', '150')

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(400)
  })
})
