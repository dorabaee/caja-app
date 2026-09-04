import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Rnd } from "react-rnd";
import type { Month, WidgetLayout } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { TableWidget } from "@ui/widgets/TableWidget";
import { LedgerWidget } from "@ui/widgets/LedgerWidget";
import { ChartWidget } from "@ui/widgets/ChartWidget";
import { DRAG_HANDLE } from "@ui/widgets/dragHandle";
import { autoArrange } from "@ui/util/autoArrange";
import { useCanvasGestures, snapPosition, type Guide } from "@ui/hooks/useCanvasGestures";
import { SelectionToolbar } from "./SelectionToolbar";
import { CanvasContextMenu, type CanvasMenuState } from "./CanvasContextMenu";
import { cn } from "@ui/common";
import styles from "./MonthCanvas.module.css";

/**
 * react-rnd hangs its resize handles ~5–10px *outside* the widget box by default, so a
 * neighbour would cover its neighbours' edges with invisible, click-eating handles. They
 * are pulled inside the box instead (each keeps its default cross-axis size), and
 * stacking is driven by hover/selection rather than DOM order. (#6) */
const RESIZE_HANDLE_STYLES = {
  top: { top: 0, height: "8px" },
  right: { right: 0, width: "8px" },
  bottom: { bottom: 0, height: "8px" },
  left: { left: 0, width: "8px" },
  topRight: { width: "14px", height: "14px", top: 0, right: 0 },
  bottomRight: { width: "14px", height: "14px", bottom: 0, right: 0 },
  bottomLeft: { width: "14px", height: "14px", bottom: 0, left: 0 },
  topLeft: { width: "14px", height: "14px", top: 0, left: 0 },
} as const;

export function MonthCanvas({ monthIndex, month }: { monthIndex: number; month: Month }) {
  const zoom = useUI((s) => s.zoom);
  const hiddenWidgets = useUI((s) => s.hiddenWidgets);
  const hiddenWidgetsLayout = useStore((s) => s.doc.settings.hiddenWidgetsLayout);
  const selectedIds = useUI((s) => s.selectedIds);
  const select = useUI((s) => s.select);
  const toggleSelect = useUI((s) => s.toggleSelect);
  const selectMany = useUI((s) => s.selectMany);
  const clearSelection = useUI((s) => s.clearSelection);
  const setWidgetLayout = useStore((s) => s.setWidgetLayout);
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [menu, setMenu] = useState<CanvasMenuState | null>(null);
  const [isRearranging, setIsRearranging] = useState(false);
  const arrangedKeyRef = useRef<string | null>(null);
  const arrangeTimerRef = useRef<number | null>(null);

  const widgets = useMemo(
    () => [...month.tables, ...month.charts]
      .filter((w) => !hiddenWidgets.has(w.id))
      .map((w) => ({ id: w.id, layout: w.layout })),
    [month.tables, month.charts, hiddenWidgets],
  );
  const visibleWidgetKey = widgets.map((w) => w.id).sort().join("|");

  // "Rearrange" is an action when the visible widget set changes, not a permanent
  // position override. Recomputing in render made every manual drag snap straight back.
  useEffect(() => {
    if (hiddenWidgetsLayout !== "arrange") {
      arrangedKeyRef.current = null;
      return;
    }
    const key = `${monthIndex}:${visibleWidgetKey}`;
    if (arrangedKeyRef.current === key) return;
    arrangedKeyRef.current = key;
    const positions = autoArrange(widgets, 1400);
    let moved = false;
    for (const widget of widgets) {
      const next = positions[widget.id];
      if (!next || (next.x === widget.layout.x && next.y === widget.layout.y)) continue;
      moved = true;
      setWidgetLayout(monthIndex, widget.id, next);
    }
    if (!moved) return;
    setIsRearranging(true);
    if (arrangeTimerRef.current) window.clearTimeout(arrangeTimerRef.current);
    arrangeTimerRef.current = window.setTimeout(() => setIsRearranging(false), 240);
  }, [hiddenWidgetsLayout, monthIndex, setWidgetLayout, visibleWidgetKey, widgets]);

  useEffect(() => () => {
    if (arrangeTimerRef.current) window.clearTimeout(arrangeTimerRef.current);
  }, []);

  const bounds = useMemo(() => {
    let w = 1200;
    let h = 700;
    for (const item of widgets) {
      const layout = item.layout;
      w = Math.max(w, layout.x + layout.w + 360);
      h = Math.max(h, layout.y + layout.h + 280);
    }
    return { w, h };
  }, [widgets]);

  const onMarquee = useCallback(
    (ids: string[], additive: boolean) => {
      if (additive) selectMany([...selectedIds, ...ids]);
      else selectMany(ids);
    },
    [selectMany, selectedIds],
  );

  const { marquee, panning, spaceHeld, onSurfacePointerDown } = useCanvasGestures({
    viewportRef,
    surfaceRef,
    items: widgets,
    onMarquee,
  });

  // Keyboard: nudge / delete / select-all / duplicate — never while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      const s = useStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectMany(widgets.map((w) => w.id));
        return;
      }
      if (e.key === "Escape") {
        clearSelection();
        return;
      }
      if (!selectedIds.size) return;
      const ids = [...selectedIds];

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        selectMany(s.duplicateWidgets(monthIndex, ids));
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.removeWidgets(monthIndex, ids);
        clearSelection();
        return;
      }
      const step = e.shiftKey ? 1 : 8;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      };
      const d = moves[e.key];
      if (!d) return;
      e.preventDefault();
      s.moveWidgets(monthIndex, ids, d[0], d[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, widgets, monthIndex, selectMany, clearSelection]);

  /** Click on a widget: plain click selects it alone, Ctrl/Shift adds or removes it. */
  const onWidgetPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.stopPropagation();
        toggleSelect(id);
        return;
      }
      if (!selectedIds.has(id)) select(id);
    },
    [selectedIds, select, toggleSelect],
  );

  const openMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedIds.has(id)) select(id);
      setMenu({ x: e.clientX, y: e.clientY, widgetId: id });
    },
    [selectedIds, select],
  );

  /**
   * Drag one widget and the rest of the selection follows by the same delta. The dragged
   * one snaps to its neighbours' edges (Alt bypasses), and everything is committed in a
   * single `moveWidgets` so the group counts as one undo step.
   */
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const onDragStop = (id: string, layout: WidgetLayout, x: number, y: number, alt: boolean) => {
    const start = dragFrom.current ?? { x: layout.x, y: layout.y };
    dragFrom.current = null;
    setGuides([]);
    const others = widgets.filter((w) => w.id !== id && !selectedIds.has(w.id));
    const snapped = alt
      ? { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
      : snapPosition(x, y, { w: layout.w, h: layout.h }, others);
    const dx = snapped.x - start.x;
    const dy = snapped.y - start.y;
    if (dx === 0 && dy === 0) return;
    const group = selectedIds.has(id) && selectedIds.size > 1 ? [...selectedIds] : [id];
    useStore.getState().moveWidgets(monthIndex, group, dx, dy);
  };

  const onDrag = (id: string, layout: WidgetLayout, x: number, y: number, alt: boolean) => {
    if (alt) {
      setGuides([]);
      return;
    }
    const others = widgets.filter((w) => w.id !== id && !selectedIds.has(w.id));
    setGuides(snapPosition(x, y, { w: layout.w, h: layout.h }, others).guides);
  };

  const zIndexFor = (widgetId: string, layout: WidgetLayout): number => {
    if (hoveredId === widgetId) return 40;
    if (selectedIds.has(widgetId)) return 30;
    return 1 + (layout.z ?? 0);
  };

  const surfaceStyle: CSSProperties = {
    width: bounds.w,
    height: bounds.h,
    transform: `scale(${zoom})`,
  };

  const rndFor = (
    id: string,
    layout: WidgetLayout,
    min: { w: number; h: number },
    children: React.ReactNode,
  ) => (
    <Rnd
      key={id}
      className={cn(styles.rnd, isRearranging && styles.rndArrange)}
      scale={zoom}
      bounds="parent"
      dragHandleClassName={DRAG_HANDLE}
      position={{ x: layout.x, y: layout.y }}
      size={{ width: layout.w, height: layout.h }}
      minWidth={min.w}
      minHeight={min.h}
      style={{ zIndex: zIndexFor(id, layout) }}
      resizeHandleStyles={RESIZE_HANDLE_STYLES}
      resizeHandleWrapperClass={styles.rndHandles}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId((prev) => (prev === id ? null : prev))}
      onPointerDownCapture={(e: React.PointerEvent) => onWidgetPointerDown(id, e)}
      onContextMenu={(e: React.MouseEvent) => openMenu(id, e)}
      onDragStart={() => {
        dragFrom.current = { x: layout.x, y: layout.y };
        if (!selectedIds.has(id)) select(id);
      }}
      onDrag={(e: MouseEvent, d: { x: number; y: number }) =>
        onDrag(id, layout, d.x, d.y, e.altKey)
      }
      onDragStop={(e: MouseEvent, d: { x: number; y: number }) =>
        onDragStop(id, layout, d.x, d.y, e.altKey)
      }
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setWidgetLayout(monthIndex, id, {
          x: Math.max(0, Math.round(pos.x)),
          y: Math.max(0, Math.round(pos.y)),
          w: Math.round(ref.offsetWidth),
          h: Math.round(ref.offsetHeight),
        })
      }
    >
      {children}
    </Rnd>
  );

  return (
    <div
      className={styles.viewport}
      ref={viewportRef}
      data-tour="canvas"
      data-panning={panning || spaceHeld ? "" : undefined}
    >
      <div className={styles.sizer} style={{ width: bounds.w * zoom, height: bounds.h * zoom }}>
        <div
          className={styles.surface}
          ref={surfaceRef}
          style={surfaceStyle}
          onPointerDown={onSurfacePointerDown}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              clearSelection();
            }
          }}
          onDoubleClick={(e) => {
            // Double-clicking bare canvas adds a table right where you clicked.
            if (e.target !== e.currentTarget) return;
            const r = surfaceRef.current?.getBoundingClientRect();
            if (!r) return;
            setMenu({
              x: e.clientX,
              y: e.clientY,
              spot: {
                x: Math.max(0, Math.round((e.clientX - r.left) / zoom)),
                y: Math.max(0, Math.round((e.clientY - r.top) / zoom)),
              },
            });
          }}
        >
          {month.tables.filter((t) => !hiddenWidgets.has(t.id)).map((t) =>
            rndFor(
              t.id,
              t.layout,
              { w: 300, h: 180 },
              t.kind === "ledger" ? (
                <LedgerWidget monthIndex={monthIndex} table={t} fill />
              ) : (
                <TableWidget monthIndex={monthIndex} table={t} fill />
              ),
            ),
          )}

          {month.charts.filter((c) => !hiddenWidgets.has(c.id)).map((c) =>
            rndFor(
              c.id,
              c.layout,
              { w: 280, h: 220 },
              <ChartWidget monthIndex={monthIndex} chart={c} tables={month.tables} fill />,
            ),
          )}

          {guides.map((g, i) => (
            <div
              key={i}
              className={g.axis === "v" ? styles.guideV : styles.guideH}
              style={g.axis === "v" ? { left: g.at } : { top: g.at }}
            />
          ))}

          {marquee && (
            <div
              className={styles.marquee}
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
            />
          )}
        </div>
      </div>

      <SelectionToolbar monthIndex={monthIndex} month={month} />
      <CanvasContextMenu monthIndex={monthIndex} state={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
