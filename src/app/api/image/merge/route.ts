import { NextRequest, NextResponse } from 'next/server'
import { mergeImages } from '@/server/image/processor'
import {
  mergeSchema,
  extractFiles,
  ValidationError,
  FileTooLargeError,
} from '@/server/image/validation'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const buffers = await extractFiles(formData)

    const rawParams = {
      direction: formData.get('direction'),
    }
    const { direction } = mergeSchema.parse(rawParams)

    const result = await mergeImages(buffers, direction)

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
