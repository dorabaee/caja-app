import type { Project, Row, Table } from "../model/types";

const REC_PREFIX = "rec-";

/** Build the synthetic row id for a recurring occurrence. */
export function recurringRowId(defId: string, monthIndex: number): string {
  return `${REC_PREFIX}${defId}-${monthIndex}`;
}

export function isRecurringRowId(rowId: string): boolean {
  return rowId.startsWith(REC_PREFIX);
}

/** Extract the RecurringDef id from a synthetic recurring row id (or null). */
export function recurringDefIdFromRowId(rowId: string): string | null {
  if (!isRecurringRowId(rowId)) return null;
  const rest = rowId.slice(REC_PREFIX.length);
  const dash = rest.lastIndexOf("-");
  return dash <= 0 ? null : rest.slice(0, dash);
}

/**
 * Read-time expansion of recurring definitions into synthetic rows for a given
 * table/month. Non-destructive: these rows are derived, never stored. Cells are
 * matched to the table's columns by column NAME. Per-occurrence overrides apply
 * skip (drops the row) and per-month cell edits.
 */
export function recurringRowsFor(
  project: Pick<Project, "recurring">,
  monthIndex: number,
  table: Table,
): Row[] {
  const defs = (project.recurring ?? []).filter(
    (d) => d.tableTitle === table.title && monthIndex >= d.fromMonth && monthIndex <= d.toMonth,
  );
  const out: Row[] = [];
  for (const d of defs) {
    const override = d.overrides?.[monthIndex];
    if (override?.skip) continue;
    const cells: Record<string, string> = {};
    for (const col of table.columns) {
      cells[col.id] = override?.cells?.[col.name] ?? d.cells[col.name] ?? "";
    }
    out.push({ id: recurringRowId(d.id, monthIndex), cells, notes: {}, links: {} });
  }
  return out;
}
