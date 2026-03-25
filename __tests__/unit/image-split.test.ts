import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { splitImage } from '@/server/image/processor'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
}

describe('splitImage', () => {
  it('should split a 200x200 image into 2x2 grid producing 4 images', async () => {
    const input = await createTestImage(200, 200)
    const result = await splitImage(input, 2, 2)

    expect(result).toHaveLength(4)

    for (const buf of result) {
      const meta = await sharp(buf).metadata()
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    }
  })

  it('should split a 300x200 image into 1x3 grid producing 3 images', async () => {
    const input = await createTestImage(300, 200)
    const result = await splitImage(input, 1, 3)

    expect(result).toHaveLength(3)

    for (const buf of result) {
      const meta = await sharp(buf).metadata()
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(200)
    }
  })

  it('should split a 300x200 image into 2x3 grid producing 6 images', async () => {
    const input = await createTestImage(300, 200)
    const result = await splitImage(input, 2, 3)

    expect(result).toHaveLength(6)

    for (const buf of result) {
      const meta = await sharp(buf).metadata()
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    }
  })

  it('should handle non-evenly-divisible dimensions', async () => {
    const input = await createTestImage(201, 201)
    const result = await splitImage(input, 2, 2)

    expect(result).toHaveLength(4)
    // Each cell should be floor(201/2)=100 or handle remainder
    for (const buf of result) {
      const meta = await sharp(buf).metadata()
      expect(meta.width).toBeGreaterThanOrEqual(100)
      expect(meta.height).toBeGreaterThanOrEqual(100)
    }
  })
})
