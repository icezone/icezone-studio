import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { getMetadata } from '@/server/image/processor'

async function createTestImage(width: number, height: number, format: 'png' | 'jpeg' = 'png'): Promise<Buffer> {
  const pipeline = sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 128, b: 255 } },
  })
  return format === 'jpeg' ? pipeline.jpeg().toBuffer() : pipeline.png().toBuffer()
}

describe('getMetadata', () => {
  it('should return correct metadata for a PNG image', async () => {
    const input = await createTestImage(640, 480, 'png')
    const meta = await getMetadata(input)

    expect(meta.width).toBe(640)
    expect(meta.height).toBe(480)
    expect(meta.format).toBe('png')
    expect(meta.size).toBeGreaterThan(0)
  })

  it('should return correct metadata for a JPEG image', async () => {
    const input = await createTestImage(1920, 1080, 'jpeg')
    const meta = await getMetadata(input)

    expect(meta.width).toBe(1920)
    expect(meta.height).toBe(1080)
    expect(meta.format).toBe('jpeg')
    expect(meta.size).toBeGreaterThan(0)
  })
})
