import { useEffect, useState, type RefObject } from "react";

/**
 * The observed width of an element, for layout decisions CSS can't express — chiefly
 * moving toolbar controls into an overflow menu, which changes the markup rather than
 * just its styling.
 *
 * Measures the element, not the window, so collapsing the sidebar (which hands the
 * content column ~230px back) is accounted for. Starts at 0; treat that as "unknown"
 * and render the roomy layout until the first measurement lands.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      // Round to whole px: sub-pixel jitter would re-render on every animation frame.
      setWidth((prev) => (Math.round(next) === prev ? prev : Math.round(next)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
