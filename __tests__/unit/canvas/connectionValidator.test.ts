import { describe, it, expect } from 'vitest';
import { isValidConnectionByDataType } from '@/features/canvas/domain/connectionValidator';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

describe('isValidConnectionByDataType', () => {
  it('allows upload (image) -> imageEdit (image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.upload, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });

  it('allows imageEdit (image) -> videoGen (image|text)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.imageEdit, CANVAS_NODE_TYPES.videoGen)).toBe(true);
  });

  it('rejects videoGen (video) -> imageEdit (image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoGen, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });

  it('rejects novelInput (text) -> imageEdit (image only)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });

  it('allows novelInput (text) -> storyboardGen (text|image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.storyboardGen)).toBe(true);
  });

  it('allows videoGen (video) -> videoAnalysis (video)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoGen, CANVAS_NODE_TYPES.videoAnalysis)).toBe(true);
  });

  it('allows storyboardGen (image-set) -> imageEdit (image) [widening]', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.storyboardGen, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });

  it('rejects connection from textAnnotation (no output)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.textAnnotation, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });
});
