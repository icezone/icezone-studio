import { useState, useCallback } from 'react';

export function useNodeExpanded() {
  const [expanded, setExpanded] = useState(false);
  const expand   = useCallback(() => setExpanded(true), []);
  const toggle   = useCallback(() => setExpanded(v => !v), []);
  const collapse = useCallback(() => setExpanded(false), []);
  return { expanded, expand, toggle, collapse };
}
