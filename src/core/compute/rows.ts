import { nextDateCell } from "../format/date";
import type { Column, Row } from "../model/types";

const PLAIN_INT = /^\d+$/;

/**
 * Seed values for a new row appended after `rows`, continuing any sequence the
 * last row established:
 *  - date columns advance one day (stored as `yyyy-MM-dd`);
 *  - text columns holding a plain integer (e.g. a "Día" counter) increment by 1;
 *  - everything else stays empty (money is never carried forward).
 * Returns an empty object when there is no prior row to continue from.
 */
export function nextRowValues(columns: Column[], rows: Row[]): Record<string, string> {
  const last = rows[rows.length - 1];
  if (!last) return {};
  const out: Record<string, string> = {};
  for (const col of columns) {
    const prev = (last.cells[col.id] ?? "").trim();
    if (!prev) continue;
    if (col.type === "date") {
      const next = nextDateCell(prev);
      if (next) out[col.id] = next;
    } else if (col.type === "text" && PLAIN_INT.test(prev)) {
      out[col.id] = String(Number(prev) + 1);
    }
  }
  return out;
}
