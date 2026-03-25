import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { POST as splitPOST } from '../../app/api/image/split/route'
import { POST as cropPOST } from '../../app/api/image/crop/route'
import { POST as metadataPOST } from '../../app/api/image/metadata/route'
import { NextRequest } from 'next/server'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toBuffer()
}

function createFormDataRequest(url: string, formData: FormData): NextRequest {
  const request = new Request(url, {
    method: 'POST',
    body: formData,
  })
  return new NextRequest(request)
}

describe('Image API validation', () => {
  it('should return 413 for file exceeding 20MB', async () => {
    // Create a buffer slightly over 20MB
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024, 0)
    const file = new File([new Uint8Array(largeBuffer)], 'large.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', '2')
    formData.append('cols', '2')

    const response = await splitPOST(
      createFormDataRequest('http://localhost/api/image/split', formData)
    )
    expect(response.status).toBe(413)

    const json = await response.json()
    expect(json.error).toBe('file_too_large')
  })

  it('should return 400 for missing file in metadata endpoint', async () => {
    const formData = new FormData()
    // No file appended

    const response = await metadataPOST(
      createFormDataRequest('http://localhost/api/image/metadata', formData)
    )
    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid split parameters (rows=0)', async () => {
    const smallBuffer = Buffer.alloc(100, 0)
    const file = new File([new Uint8Array(smallBuffer)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', '0')
    formData.append('cols', '2')

    const response = await splitPOST(
      createFormDataRequest('http://localhost/api/image/split', formData)
    )
    expect(response.status).toBe(400)
  })

  it('should return 400 for non-numeric split parameters', async () => {
    const smallBuffer = Buffer.alloc(100, 0)
    const file = new File([new Uint8Array(smallBuffer)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', 'abc')
    formData.append('cols', '2')

    const response = await splitPOST(
      createFormDataRequest('http://localhost/api/image/split', formData)
    )
    expect(response.status).toBe(400)
  })

  it('should return 400 for unsupported file type', async () => {
    const textBuffer = Buffer.from('not an image')
    const file = new File([new Uint8Array(textBuffer)], 'test.txt', { type: 'text/plain' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('rows', '2')
    formData.append('cols', '2')

    const response = await splitPOST(
      createFormDataRequest('http://localhost/api/image/split', formData)
    )
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('Unsupported image type')
  })

  it('should return 400 for crop region exceeding image bounds', async () => {
    const imgBuf = await createTestImage(200, 200)
    const file = new File([new Uint8Array(imgBuf)], 'test.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('x', '100')
    formData.append('y', '100')
    formData.append('width', '200')  // 100+200=300 > 200
    formData.append('height', '50')

    const response = await cropPOST(
      createFormDataRequest('http://localhost/api/image/crop', formData)
    )
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('exceeds image dimensions')
  })
})
