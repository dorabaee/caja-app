import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { WidgetLayout } from "@core/model/types";
import { useUI } from "@core/store";

export interface CanvasItem {
  id: string;
  layout: WidgetLayout;
}

export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How close (canvas px) an edge has to be before it snaps to a neighbour's. */
const SNAP_PX = 6;
/** The canvas dot grid, which drags also snap to. */
const GRID = 24;

export interface Guide {
  /** "v" runs top-to-bottom at x; "h" runs left-to-right at y. */
  axis: "v" | "h";
  at: number;
}

/**
 * Where a dragged widget should land, and the guides to draw for it. Compares the
 * dragged box's left/centre/right (and top/middle/bottom) against every other widget,
 * taking the closest match within SNAP_PX; falls back to the dot grid so a widget with
 * no neighbours still lands cleanly.
 */
export function snapPosition(
  x: number,
  y: number,
  size: { w: number; h: number },
  others: CanvasItem[],
): { x: number; y: number; guides: Guide[] } {
  const guides: Guide[] = [];
  const mine = {
    v: [x, x + size.w / 2, x + size.w],
    h: [y, y + size.h / 2, y + size.h],
  };

  const best = (axis: "v" | "h") => {
    let delta: number | null = null;
    let at = 0;
    for (const o of others) {
      const theirs =
        axis === "v"
          ? [o.layout.x, o.layout.x + o.layout.w / 2, o.layout.x + o.layout.w]
          : [o.layout.y, o.layout.y + o.layout.h / 2, o.layout.y + o.layout.h];
      for (const m of mine[axis]) {
        for (const t of theirs) {
          const d = t - m;
          if (Math.abs(d) <= SNAP_PX && (delta == null || Math.abs(d) < Math.abs(delta))) {
            delta = d;
            at = t;
          }
        }
      }
    }
    return delta == null ? null : { delta, at };
  };

  const v = best("v");
  const h = best("h");
  let nx = v ? x + v.delta : Math.round(x / GRID) * GRID;
  let ny = h ? y + h.delta : Math.round(y / GRID) * GRID;
  if (v) guides.push({ axis: "v", at: v.at });
  if (h) guides.push({ axis: "h", at: h.at });
  nx = Math.max(0, Math.round(nx));
  ny = Math.max(0, Math.round(ny));
  return { x: nx, y: ny, guides };
}

/**
 * Canvas-level gestures that don't belong to any single widget: the Ctrl+drag marquee,
 * Space/middle-button panning, and Ctrl+wheel zoom anchored at the pointer.
 *
 * `viewportRef` is the scrolling box; `surfaceRef` the zoomed surface inside it. All
 * geometry is converted to canvas coordinates (divided by zoom) so gestures behave the
 * same at any zoom level.
 */
export function useCanvasGestures({
  viewportRef,
  surfaceRef,
  items,
  onMarquee,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  items: CanvasItem[];
  onMarquee: (ids: string[], additive: boolean) => void;
}) {
  const zoom = useUI((s) => s.zoom);
  const setZoom = useUI((s) => s.setZoom);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  // Read inside listeners that are registered once; keeps them off the dependency list.
  const live = useRef({ zoom, items });
  live.current = { zoom, items };

  /** Pointer position in canvas coordinates. */
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const surface = surfaceRef.current;
      if (!surface) return { x: 0, y: 0 };
      const r = surface.getBoundingClientRect();
      return { x: (clientX - r.left) / live.current.zoom, y: (clientY - r.top) / live.current.zoom };
    },
    [surfaceRef],
  );

  // Space = pan mode, but never while typing in a cell.
  useEffect(() => {
    const isTyping = () => {
      const ae = document.activeElement;
      return !!ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping()) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    // Losing focus mid-hold would otherwise leave the canvas stuck in pan mode.
    const blur = () => setSpaceHeld(false);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /** Ctrl+wheel zooms about the pointer instead of the canvas's top-left corner. */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const prev = live.current.zoom;
      const next = Math.min(2, Math.max(0.4, Math.round((prev - e.deltaY * 0.0015) * 100) / 100));
      if (next === prev) return;
      // Keep the point under the cursor fixed: its canvas coords must map to the same
      // client position after the scale changes.
      const r = vp.getBoundingClientRect();
      const px = e.clientX - r.left + vp.scrollLeft;
      const py = e.clientY - r.top + vp.scrollTop;
      const ratio = next / prev;
      setZoom(next);
      requestAnimationFrame(() => {
        vp.scrollLeft = px * ratio - (e.clientX - r.left);
        vp.scrollTop = py * ratio - (e.clientY - r.top);
      });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [viewportRef, setZoom]);

  /** Middle-button or Space+drag pans; Ctrl+drag on empty canvas draws the marquee. */
  const onSurfacePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const wantsPan = e.button === 1 || spaceHeld;
      const wantsMarquee = e.button === 0 && (e.ctrlKey || e.metaKey || e.shiftKey);
      if (!wantsPan && !wantsMarquee) return;
      e.preventDefault();
      e.stopPropagation();

      if (wantsPan) {
        setPanning(true);
        const startX = e.clientX;
        const startY = e.clientY;
        const sl = vp.scrollLeft;
        const st = vp.scrollTop;
        const move = (ev: PointerEvent) => {
          vp.scrollLeft = sl - (ev.clientX - startX);
          vp.scrollTop = st - (ev.clientY - startY);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          setPanning(false);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return;
      }

      const additive = e.shiftKey;
      const origin = toCanvas(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => {
        const p = toCanvas(ev.clientX, ev.clientY);
        setMarquee({
          x: Math.min(origin.x, p.x),
          y: Math.min(origin.y, p.y),
          w: Math.abs(p.x - origin.x),
          h: Math.abs(p.y - origin.y),
        });
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const p = toCanvas(ev.clientX, ev.clientY);
        const box = {
          x: Math.min(origin.x, p.x),
          y: Math.min(origin.y, p.y),
          w: Math.abs(p.x - origin.x),
          h: Math.abs(p.y - origin.y),
        };
        setMarquee(null);
        // A stray click (no real drag) shouldn't wipe the selection silently.
        if (box.w < 4 && box.h < 4) return;
        const hit = live.current.items
          .filter(
            (it) =>
              it.layout.x < box.x + box.w &&
              it.layout.x + it.layout.w > box.x &&
              it.layout.y < box.y + box.h &&
              it.layout.y + it.layout.h > box.y,
          )
          .map((it) => it.id);
        onMarquee(hit, additive);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [viewportRef, spaceHeld, toCanvas, onMarquee],
  );

  return { marquee, panning, spaceHeld, onSurfacePointerDown };
}
