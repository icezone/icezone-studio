import { NextRequest, NextResponse } from 'next/server'
import { getMetadata } from '@/server/image/processor'
import {
  extractFile,
  ValidationError,
  FileTooLargeError,
} from '@/server/image/validation'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const buffer = await extractFile(formData)

    const metadata = await getMetadata(buffer)

    return NextResponse.json(metadata)
  } catch (error) {
    if (error instanceof FileTooLargeError) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
