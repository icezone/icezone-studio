import { describe, it, expect } from 'vitest';
import {
  getConnectMenuNodeTypes,
  isValidConnectionByDataType,
} from '@/features/canvas/domain/connectionValidator';
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

  it('allows novelInput (text) -> imageEdit (text+image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
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

  it('allows videoAnalysis (image-set) -> videoGen (image|text) [widening closes the video re-gen loop]', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoAnalysis, CANVAS_NODE_TYPES.videoGen)).toBe(true);
  });

  it('still allows imageEdit (image) -> imageEdit (chaining)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.imageEdit, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });
});

describe('getConnectMenuNodeTypes', () => {
  it('source-direction from upload (image) returns image-accepting targets', () => {
    const types = getConnectMenuNodeTypes('source', CANVAS_NODE_TYPES.upload);
    expect(types).toContain(CANVAS_NODE_TYPES.imageEdit);
    expect(types).toContain(CANVAS_NODE_TYPES.storyboardSplit);
    expect(types).toContain(CANVAS_NODE_TYPES.storyboardGen);
    expect(types).toContain(CANVAS_NODE_TYPES.videoGen);
    expect(types).not.toContain(CANVAS_NODE_TYPES.videoAnalysis);
    expect(types).not.toContain(CANVAS_NODE_TYPES.upload);
    expect(types).not.toContain(CANVAS_NODE_TYPES.textAnnotation);
  });

  it('source-direction from novelInput (text) returns text-accepting targets', () => {
    const types = getConnectMenuNodeTypes('source', CANVAS_NODE_TYPES.novelInput);
    expect(types).toContain(CANVAS_NODE_TYPES.imageEdit);
    expect(types).toContain(CANVAS_NODE_TYPES.storyboardGen);
    expect(types).toContain(CANVAS_NODE_TYPES.videoGen);
    expect(types).not.toContain(CANVAS_NODE_TYPES.storyboardSplit);
    expect(types).not.toContain(CANVAS_NODE_TYPES.videoAnalysis);
  });

  it('source-direction from videoGen (video) returns only videoAnalysis', () => {
    const types = getConnectMenuNodeTypes('source', CANVAS_NODE_TYPES.videoGen);
    expect(types).toEqual([CANVAS_NODE_TYPES.videoAnalysis]);
  });

  it('target-direction into imageEdit accepts image and text producers', () => {
    const types = getConnectMenuNodeTypes('target', CANVAS_NODE_TYPES.imageEdit);
    expect(types).toContain(CANVAS_NODE_TYPES.upload);
    expect(types).toContain(CANVAS_NODE_TYPES.imageEdit);
    expect(types).toContain(CANVAS_NODE_TYPES.novelInput);
    expect(types).toContain(CANVAS_NODE_TYPES.storyboardGen);
    expect(types).toContain(CANVAS_NODE_TYPES.storyboardSplit);
    expect(types).toContain(CANVAS_NODE_TYPES.videoAnalysis);
    expect(types).not.toContain(CANVAS_NODE_TYPES.videoGen);
  });

  it('target-direction into videoAnalysis accepts only video producers', () => {
    const types = getConnectMenuNodeTypes('target', CANVAS_NODE_TYPES.videoAnalysis);
    expect(types).toEqual([CANVAS_NODE_TYPES.videoGen]);
  });

  it('returns empty for nodes with no matching handle (upload as target anchor)', () => {
    expect(getConnectMenuNodeTypes('target', CANVAS_NODE_TYPES.upload)).toEqual([]);
  });
});
