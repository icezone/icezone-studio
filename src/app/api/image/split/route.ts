import { NextRequest, NextResponse } from 'next/server'
import { splitImage } from '@/server/image/processor'
import {
  splitSchema,
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
      rows: formData.get('rows'),
      cols: formData.get('cols'),
    }
    const { rows, cols } = splitSchema.parse(rawParams)

    const images = await splitImage(buffer, rows, cols)
    const base64Images = images.map((buf) => buf.toString('base64'))

    return NextResponse.json({ images: base64Images })
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
