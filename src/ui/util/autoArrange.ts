import type { WidgetLayout } from "@core/model/types";

export interface ArrangeItem {
  id: string;
  layout: WidgetLayout;
}

/**
 * Shelf-pack widgets left→right, wrapping to a new row when the next one would
 * overflow `maxWidth`. Pure: returns new {x,y} per id (sizes unchanged).
 */
export function autoArrange(
  items: ArrangeItem[],
  maxWidth: number,
  gap = 24,
  pad = 24,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  let x = pad;
  let y = pad;
  let rowHeight = 0;
  for (const it of items) {
    const w = it.layout.w;
    if (x > pad && x + w > maxWidth - pad) {
      x = pad;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    out[it.id] = { x, y };
    x += w + gap;
    rowHeight = Math.max(rowHeight, it.layout.h);
  }
  return out;
}
