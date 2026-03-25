import { z } from 'zod'

export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
export const MAX_MERGE_FILES = 50

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
])

export const splitSchema = z.object({
  rows: z.coerce.number().int().min(1).max(10),
  cols: z.coerce.number().int().min(1).max(10),
})

export const cropSchema = z.object({
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  width: z.coerce.number().int().min(1),
  height: z.coerce.number().int().min(1),
})

export const mergeSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']),
})

/**
 * Extract a single file from FormData and validate size.
 * Returns the file buffer or throws.
 */
export async function extractFile(
  formData: FormData,
  fieldName = 'file'
): Promise<Buffer> {
  const file = formData.get(fieldName)
  if (!file || !(file instanceof File)) {
    throw new ValidationError('Missing or invalid file field')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new FileTooLargeError()
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ValidationError(`Unsupported image type: ${file.type}`)
  }
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Extract multiple files from FormData.
 */
export async function extractFiles(
  formData: FormData,
  fieldName = 'files'
): Promise<Buffer[]> {
  const files = formData.getAll(fieldName)
  if (!files.length) {
    throw new ValidationError('No files provided')
  }
  if (files.length > MAX_MERGE_FILES) {
    throw new ValidationError(`Too many files (max ${MAX_MERGE_FILES})`)
  }

  const buffers: Buffer[] = []
  for (const file of files) {
    if (!(file instanceof File)) {
      throw new ValidationError('Invalid file in files list')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError()
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError(`Unsupported image type: ${file.type}`)
    }
    const arrayBuffer = await file.arrayBuffer()
    buffers.push(Buffer.from(arrayBuffer))
  }
  return buffers
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super('File too large')
    this.name = 'FileTooLargeError'
  }
}
