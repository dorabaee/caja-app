import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Rnd } from "react-rnd";
import type { Month } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { TableWidget } from "@ui/widgets/TableWidget";
import { LedgerWidget } from "@ui/widgets/LedgerWidget";
import { ChartWidget } from "@ui/widgets/ChartWidget";
import { DRAG_HANDLE } from "@ui/widgets/dragHandle";
import styles from "./MonthCanvas.module.css";

export function MonthCanvas({ monthIndex, month }: { monthIndex: number; month: Month }) {
  const zoom = useUI((s) => s.zoom);
  const selectedId = useUI((s) => s.selectedWidgetId);
  const select = useUI((s) => s.select);
  const setWidgetLayout = useStore((s) => s.setWidgetLayout);
  const viewportRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => {
    let w = 1200;
    let h = 700;
    for (const item of [...month.tables, ...month.charts]) {
      w = Math.max(w, item.layout.x + item.layout.w + 360);
      h = Math.max(h, item.layout.y + item.layout.h + 280);
    }
    return { w, h };
  }, [month.tables, month.charts]);

  // Keyboard nudge / delete — only when a widget is selected and focus isn't in a field.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      const table = month.tables.find((x) => x.id === selectedId);
      const chart = table ? undefined : month.charts.find((x) => x.id === selectedId);
      const layout = table?.layout ?? chart?.layout;
      if (!layout) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (table) useStore.getState().removeTable(monthIndex, selectedId);
        else useStore.getState().removeChart(monthIndex, selectedId);
        select(null);
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
      setWidgetLayout(monthIndex, selectedId, {
        x: Math.max(0, layout.x + d[0]),
        y: Math.max(0, layout.y + d[1]),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, monthIndex, month.tables, month.charts, setWidgetLayout, select]);

  const surfaceStyle: CSSProperties = {
    width: bounds.w,
    height: bounds.h,
    transform: `scale(${zoom})`,
  };

  return (
    <div className={styles.viewport} ref={viewportRef}>
      <div className={styles.sizer} style={{ width: bounds.w * zoom, height: bounds.h * zoom }}>
        <div
          className={styles.surface}
          style={surfaceStyle}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) select(null);
          }}
        >
          {month.tables.map((t) => (
            <Rnd
              key={t.id}
              className={styles.rnd}
              scale={zoom}
              bounds="parent"
              dragHandleClassName={DRAG_HANDLE}
              position={{ x: t.layout.x, y: t.layout.y }}
              size={{ width: t.layout.w, height: t.layout.h }}
              minWidth={300}
              minHeight={180}
              style={{ zIndex: selectedId === t.id ? 2 : 1 }}
              onDragStart={() => select(t.id)}
              onDragStop={(_e, d) =>
                setWidgetLayout(monthIndex, t.id, {
                  x: Math.max(0, Math.round(d.x)),
                  y: Math.max(0, Math.round(d.y)),
                })
              }
              onResizeStop={(_e, _dir, ref, _delta, pos) =>
                setWidgetLayout(monthIndex, t.id, {
                  x: Math.max(0, Math.round(pos.x)),
                  y: Math.max(0, Math.round(pos.y)),
                  w: Math.round(ref.offsetWidth),
                  h: Math.round(ref.offsetHeight),
                })
              }
            >
              {t.kind === "ledger" ? (
                <LedgerWidget monthIndex={monthIndex} table={t} fill />
              ) : (
                <TableWidget monthIndex={monthIndex} table={t} fill />
              )}
            </Rnd>
          ))}

          {month.charts.map((c) => (
            <Rnd
              key={c.id}
              className={styles.rnd}
              scale={zoom}
              bounds="parent"
              dragHandleClassName={DRAG_HANDLE}
              position={{ x: c.layout.x, y: c.layout.y }}
              size={{ width: c.layout.w, height: c.layout.h }}
              minWidth={280}
              minHeight={220}
              style={{ zIndex: selectedId === c.id ? 2 : 1 }}
              onDragStart={() => select(c.id)}
              onDragStop={(_e, d) =>
                setWidgetLayout(monthIndex, c.id, {
                  x: Math.max(0, Math.round(d.x)),
                  y: Math.max(0, Math.round(d.y)),
                })
              }
              onResizeStop={(_e, _dir, ref, _delta, pos) =>
                setWidgetLayout(monthIndex, c.id, {
                  x: Math.max(0, Math.round(pos.x)),
                  y: Math.max(0, Math.round(pos.y)),
                  w: Math.round(ref.offsetWidth),
                  h: Math.round(ref.offsetHeight),
                })
              }
            >
              <ChartWidget monthIndex={monthIndex} chart={c} tables={month.tables} fill />
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  );
}
