import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { cropImage } from '@/server/image/processor'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .png()
    .toBuffer()
}

describe('cropImage', () => {
  it('should crop to specified region', async () => {
    const input = await createTestImage(400, 300)
    const result = await cropImage(input, 10, 20, 200, 150)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })

  it('should crop to 16:9 aspect ratio from center', async () => {
    const input = await createTestImage(400, 400)
    // 16:9 crop: 400 wide, height = 400 * 9/16 = 225
    const result = await cropImage(input, 0, 87, 400, 225)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(400)
    expect(meta.height).toBe(225)
    // Verify approximate 16:9 ratio
    const ratio = meta.width! / meta.height!
    expect(ratio).toBeCloseTo(16 / 9, 1)
  })

  it('should crop a small region from top-left corner', async () => {
    const input = await createTestImage(800, 600)
    const result = await cropImage(input, 0, 0, 100, 100)
    const meta = await sharp(result).metadata()

    expect(meta.width).toBe(100)
    expect(meta.height).toBe(100)
  })
})
