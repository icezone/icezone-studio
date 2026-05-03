import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeExpanded } from './useNodeExpanded';

describe('useNodeExpanded', () => {
  it('starts collapsed', () => {
    const { result } = renderHook(() => useNodeExpanded());
    expect(result.current.expanded).toBe(false);
  });

  it('toggle flips expanded state', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.toggle(); });
    expect(result.current.expanded).toBe(true);
    act(() => { result.current.toggle(); });
    expect(result.current.expanded).toBe(false);
  });

  it('collapse sets expanded to false when expanded', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.toggle(); });
    act(() => { result.current.collapse(); });
    expect(result.current.expanded).toBe(false);
  });

  it('collapse is idempotent when already collapsed', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.collapse(); });
    expect(result.current.expanded).toBe(false);
  });
});
