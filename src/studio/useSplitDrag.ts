import { useEffect, useRef, useState } from 'react';

/**
 * Draggable vertical split between the editor and the preview. Owns the divider
 * ref, the drag state and the left-pane width percentage (clamped to 25–75%).
 */
export function useSplitDrag(initialPct = 46) {
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [splitPct, setSplitPct] = useState(initialPct);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startDrag = () => {
    dragging.current = true;
  };

  return { splitRef, splitPct, startDrag };
}
