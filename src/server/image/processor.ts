import sharp from 'sharp'

/**
 * Split an image into a grid of rows x cols tiles.
 */
export async function splitImage(
  buffer: Buffer,
  rows: number,
  cols: number
): Promise<Buffer[]> {
  const meta = await sharp(buffer).metadata()
  const imgWidth = meta.width!
  const imgHeight = meta.height!

  const tileWidth = Math.floor(imgWidth / cols)
  const tileHeight = Math.floor(imgHeight / rows)

  const results: Buffer[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * tileWidth
      const top = row * tileHeight
      // Last column/row gets remaining pixels
      const width = col === cols - 1 ? imgWidth - left : tileWidth
      const height = row === rows - 1 ? imgHeight - top : tileHeight

      const tile = await sharp(buffer)
        .extract({ left, top, width, height })
        .toBuffer()

      results.push(tile)
    }
  }

  return results
}

/**
 * Crop an image to the specified region.
 */
export async function cropImage(
  buffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(buffer)
    .extract({ left: x, top: y, width, height })
    .toBuffer()
}

/**
 * Merge multiple images in a given direction.
 */
export async function mergeImages(
  buffers: Buffer[],
  direction: 'horizontal' | 'vertical'
): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error('No images to merge')
  }

  const metadatas = await Promise.all(
    buffers.map((buf) => sharp(buf).metadata())
  )

  if (direction === 'horizontal') {
    const maxHeight = Math.max(...metadatas.map((m) => m.height!))
    const totalWidth = metadatas.reduce((sum, m) => sum + m.width!, 0)

    // Resize each image to maxHeight, preserving width proportionally
    const resizedBuffers = await Promise.all(
      buffers.map((buf, i) => {
        if (metadatas[i].height === maxHeight) return Promise.resolve(buf)
        return sharp(buf).resize({ height: maxHeight }).toBuffer()
      })
    )

    // Re-read metadata after resize
    const resizedMeta = await Promise.all(
      resizedBuffers.map((buf) => sharp(buf).metadata())
    )

    const composites: sharp.OverlayOptions[] = []
    let offsetX = 0
    for (let i = 0; i < resizedBuffers.length; i++) {
      composites.push({ input: resizedBuffers[i], left: offsetX, top: 0 })
      offsetX += resizedMeta[i].width!
    }

    return sharp({
      create: {
        width: offsetX,
        height: maxHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer()
  } else {
    const maxWidth = Math.max(...metadatas.map((m) => m.width!))
    const totalHeight = metadatas.reduce((sum, m) => sum + m.height!, 0)

    const resizedBuffers = await Promise.all(
      buffers.map((buf, i) => {
        if (metadatas[i].width === maxWidth) return Promise.resolve(buf)
        return sharp(buf).resize({ width: maxWidth }).toBuffer()
      })
    )

    const resizedMeta = await Promise.all(
      resizedBuffers.map((buf) => sharp(buf).metadata())
    )

    const composites: sharp.OverlayOptions[] = []
    let offsetY = 0
    for (let i = 0; i < resizedBuffers.length; i++) {
      composites.push({ input: resizedBuffers[i], left: 0, top: offsetY })
      offsetY += resizedMeta[i].height!
    }

    return sharp({
      create: {
        width: maxWidth,
        height: offsetY,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer()
  }
}

/**
 * Resize an image to specified dimensions. If only width is given, maintain aspect ratio.
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height?: number
): Promise<Buffer> {
  const options: sharp.ResizeOptions = height
    ? { width, height, fit: 'fill' }
    : { width }

  return sharp(buffer).resize(options).toBuffer()
}

/**
 * Get image metadata.
 */
export async function getMetadata(
  buffer: Buffer
): Promise<{ width: number; height: number; format: string; size: number }> {
  const meta = await sharp(buffer).metadata()
  return {
    width: meta.width!,
    height: meta.height!,
    format: meta.format!,
    size: buffer.length,
  }
}
