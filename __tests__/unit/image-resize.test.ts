import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { resizeImage } from '@/server/image/processor'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toBuffer()
}

describe('resizeImage', () => {
  it('should resize to specified width maintaining aspect ratio', async () => {
    const input = await createTestImage(800, 600)
    const result = await resizeImage(input, 400)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(400)
    expect(meta.height).toBe(300)
  })

  it('should resize to specified width and height', async () => {
    const input = await createTestImage(800, 600)
    const result = await resizeImage(input, 400, 400)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(400)
    expect(meta.height).toBe(400)
  })

  it('should upscale a small image', async () => {
    const input = await createTestImage(100, 100)
    const result = await resizeImage(input, 500)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(500)
    expect(meta.height).toBe(500)
  })
})
