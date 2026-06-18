import { useMemo } from "react";
import { useStore } from "@core/store";
import type { Row, Table } from "@core/model/types";
import { recurringRowsFor } from "@core/compute";

/**
 * The recurring rows that materialize into a table for the given month. Subscribes
 * only to the current project's `recurring` defs, so editing ordinary cells does
 * not re-render the widget. Returns [] when the project defines no recurring rows.
 */
export function useRecurringRows(monthIndex: number, table: Table): Row[] {
  const recurring = useStore((s) => {
    const p = s.doc.projects.find((x) => x.id === s.doc.currentProjectId);
    return p?.recurring;
  });
  // Mirror materializeMonth: only the FIRST table with a given title hosts the
  // recurring rows, so a duplicate-titled table doesn't render/total them twice.
  const isPrimary = useStore((s) => {
    const p = s.doc.projects.find((x) => x.id === s.doc.currentProjectId);
    const tables = p?.months[monthIndex]?.tables ?? [];
    const first = tables.find((x) => x.title === table.title);
    return !first || first.id === table.id;
  });
  return useMemo(() => {
    if (!isPrimary || !recurring?.length) return [];
    return recurringRowsFor({ recurring }, monthIndex, table);
  }, [isPrimary, recurring, monthIndex, table]);
}
