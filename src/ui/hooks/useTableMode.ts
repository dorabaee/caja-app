import { useCallback, useEffect, useMemo, useState } from "react";
import type { Table } from "@core/model/types";
import { useStore } from "@core/store";

/**
 * A table widget is in exactly one mode at a time:
 * - "idle": normal editing.
 * - "reorder": drag rows *and columns* into a new order; everything else is read-only (#2).
 * - "columns": pick columns to delete; only the headers stay live (#5).
 *
 * Both non-idle modes are *staged* — the drafted order / the columns marked for deletion
 * live here in component state and only reach the store when the user confirms with ✓, so
 * ✕ can genuinely discard. A single mode value (rather than two booleans) keeps them from
 * being entered at the same time.
 */
export type WidgetMode = "idle" | "reorder" | "columns";

export function useTableMode(monthIndex: number, table: Table) {
  const [mode, setMode] = useState<WidgetMode>("idle");
  const [rowOrder, setRowOrder] = useState<string[] | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<ReadonlySet<string>>(() => new Set());

  const reset = useCallback(() => {
    setMode("idle");
    setRowOrder(null);
    setColumnOrder(null);
    setPendingDeletes(new Set());
  }, []);

  // Switching month/table out from under an open mode would otherwise leave a draft
  // order pointing at rows that no longer exist.
  useEffect(() => reset(), [table.id, monthIndex, reset]);

  const startReorder = useCallback(() => {
    setRowOrder(table.rows.map((r) => r.id));
    setColumnOrder(table.columns.map((c) => c.id));
    setPendingDeletes(new Set());
    setMode("reorder");
  }, [table.rows, table.columns]);

  const startColumns = useCallback(() => {
    setPendingDeletes(new Set());
    setRowOrder(null);
    setColumnOrder(null);
    setMode("columns");
  }, []);

  /** At least one column has to survive, so the last one can't be staged. */
  const canStageMore = table.columns.length - pendingDeletes.size > 1;

  const stageDelete = useCallback(
    (columnId: string) =>
      setPendingDeletes((prev) => {
        if (prev.has(columnId)) return prev;
        if (table.columns.length - prev.size <= 1) return prev;
        const next = new Set(prev);
        next.add(columnId);
        return next;
      }),
    [table.columns.length],
  );

  const unstageDelete = useCallback(
    (columnId: string) =>
      setPendingDeletes((prev) => {
        if (!prev.has(columnId)) return prev;
        const next = new Set(prev);
        next.delete(columnId);
        return next;
      }),
    [],
  );

  const confirm = useCallback(() => {
    const s = useStore.getState();
    if (mode === "reorder") {
      if (rowOrder) s.setRowOrder(monthIndex, table.id, rowOrder);
      if (columnOrder) s.setColumnOrder(monthIndex, table.id, columnOrder);
    }
    if (mode === "columns" && pendingDeletes.size)
      s.removeColumns(monthIndex, table.id, [...pendingDeletes]);
    reset();
  }, [mode, rowOrder, columnOrder, pendingDeletes, monthIndex, table.id, reset]);

  // Esc is the keyboard twin of ✕ — the mode still can't be left by clicking away.
  useEffect(() => {
    if (mode === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, reset]);

  const dirty =
    (mode === "reorder" &&
      ((!!rowOrder && rowOrder.some((rid, i) => table.rows[i]?.id !== rid)) ||
        (!!columnOrder && columnOrder.some((cid, i) => table.columns[i]?.id !== cid)))) ||
    (mode === "columns" && pendingDeletes.size > 0);

  return useMemo(
    () => ({
      mode,
      rowOrder,
      setRowOrder,
      columnOrder,
      setColumnOrder,
      pendingDeletes,
      canStageMore,
      stageDelete,
      unstageDelete,
      startReorder,
      startColumns,
      cancel: reset,
      confirm,
      dirty,
    }),
    [
      mode,
      rowOrder,
      columnOrder,
      pendingDeletes,
      canStageMore,
      stageDelete,
      unstageDelete,
      startReorder,
      startColumns,
      reset,
      confirm,
      dirty,
    ],
  );
}

export type TableModeApi = ReturnType<typeof useTableMode>;
