import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NodeTypeBadge } from '@/features/canvas/ui/NodeTypeBadge';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

describe('NodeTypeBadge', () => {
  it('renders short label for imageEdit', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.imageEdit} />);
    expect(container.textContent).toBe('IMG');
  });
  it('renders short label for videoGen', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.videoGen} />);
    expect(container.textContent).toBe('VID');
  });
  it('renders short label for storyboardGen', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardGen} />);
    expect(container.textContent).toBe('SBG');
  });
  it('renders short label for videoAnalysis', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.videoAnalysis} />);
    expect(container.textContent).toBe('VAN');
  });
  it('renders short label for storyboardSplit', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardSplit} />);
    expect(container.textContent).toBe('SBS');
  });
});
