import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { POST } from '../../app/api/image/split/route'
import { NextRequest } from 'next/server'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
}

function createFormDataRequest(formData: FormData): NextRequest {
  // Build a real Request from FormData, then wrap as NextRequest
  const request = new Request('http://localhost/api/image/split', {
    method: 'POST',
    body: formData,
  })
  return new NextRequest(request)
}

describe('POST /api/image/split', () => {
  it('should split a 200x200 image into 2x2 grid', async () => {
    const imgBuf = await createTestImage(200, 200)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', '2')
    formData.append('cols', '2')

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.images).toHaveLength(4)

    // Verify each image is valid base64 that decodes to a 100x100 image
    for (const b64 of json.images) {
      const buf = Buffer.from(b64, 'base64')
      const meta = await sharp(buf).metadata()
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    }
  })

  it('should return 400 for missing rows/cols', async () => {
    const imgBuf = await createTestImage(200, 200)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    // Missing rows and cols

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid rows value', async () => {
    const imgBuf = await createTestImage(200, 200)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', '0')
    formData.append('cols', '2')

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(400)
  })

  it('should return 400 for missing file', async () => {
    const formData = new FormData()
    formData.append('rows', '2')
    formData.append('cols', '2')

    const response = await POST(createFormDataRequest(formData))
    expect(response.status).toBe(400)
  })
})
