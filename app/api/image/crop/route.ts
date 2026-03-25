import { NextRequest, NextResponse } from 'next/server'
import { cropImage, getMetadata } from '@/server/image/processor'
import {
  cropSchema,
  extractFile,
  ValidationError,
  FileTooLargeError,
} from '@/server/image/validation'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const buffer = await extractFile(formData)

    const rawParams = {
      x: formData.get('x'),
      y: formData.get('y'),
      width: formData.get('width'),
      height: formData.get('height'),
    }
    const { x, y, width, height } = cropSchema.parse(rawParams)

    // M2: validate crop bounds against actual image dimensions
    const meta = await getMetadata(buffer)
    if (x + width > meta.width || y + height > meta.height) {
      return NextResponse.json(
        { error: `Crop region (${x}+${width}, ${y}+${height}) exceeds image dimensions (${meta.width}x${meta.height})` },
        { status: 400 }
      )
    }

    const result = await cropImage(buffer, x, y, width, height)

    return new NextResponse(new Uint8Array(result), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    })
  } catch (error) {
    if (error instanceof FileTooLargeError) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
