import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200),
})

export const saveDraftSchema = z.object({
  data: z.object({}).passthrough(),
  expectedRevision: z.number().int().min(0),
})

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
})

// ─── Template schemas ────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  thumbnailUrl: z.string().url().optional(),
  isPublic: z.boolean().optional().default(false),
  templateData: z.object({
    version: z.number().int().positive(),
    nodes: z.array(z.object({}).passthrough()),
    edges: z.array(z.object({}).passthrough()),
    metadata: z.object({}).passthrough(),
  }),
})

export const publishTemplateSchema = z.object({
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  thumbnailUrl: z.string().url().optional(),
})

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  templateData: z.object({
    version: z.number().int().positive(),
    nodes: z.array(z.object({}).passthrough()),
    edges: z.array(z.object({}).passthrough()),
    metadata: z.object({}).passthrough(),
  }).optional(),
})
