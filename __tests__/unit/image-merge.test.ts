import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { mergeImages } from '@/server/image/processor'

async function createTestImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number } = { r: 255, g: 0, b: 0 }
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer()
}

describe('mergeImages', () => {
  it('should merge 2 images horizontally', async () => {
    const img1 = await createTestImage(100, 200, { r: 255, g: 0, b: 0 })
    const img2 = await createTestImage(100, 200, { r: 0, g: 0, b: 255 })

    const result = await mergeImages([img1, img2], 'horizontal')
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(200)
    expect(meta.height).toBe(200)
  })

  it('should merge 2 images vertically', async () => {
    const img1 = await createTestImage(200, 100, { r: 255, g: 0, b: 0 })
    const img2 = await createTestImage(200, 100, { r: 0, g: 0, b: 255 })

    const result = await mergeImages([img1, img2], 'vertical')
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(200)
    expect(meta.height).toBe(200)
  })

  it('should merge 3 images horizontally', async () => {
    const imgs = await Promise.all([
      createTestImage(100, 150),
      createTestImage(100, 150),
      createTestImage(100, 150),
    ])

    const result = await mergeImages(imgs, 'horizontal')
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(300)
    expect(meta.height).toBe(150)
  })

  it('should merge images with different heights horizontally (use max height)', async () => {
    const img1 = await createTestImage(100, 100)
    const img2 = await createTestImage(100, 200)

    const result = await mergeImages([img1, img2], 'horizontal')
    const meta = await sharp(result).metadata()

    // img1 resized from 100x100 to height=200 → width becomes 200
    // img2 stays 100x200. Total = 300x200
    expect(meta.width).toBe(300)
    expect(meta.height).toBe(200)
  })
})
