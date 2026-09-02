import type { Column, Row, Table } from "../model/types";

/**
 * Where a table keeps its categories. Two shapes are supported, and a table may use
 * either (never both — `setCategoryColumn` moves the marker):
 *
 * - a dedicated `type: "category"` column, whose cell is nothing but the chip;
 * - a text column flagged `withCategory`, which holds the description you type AND the
 *   category you pick, shown one face at a time.
 *
 * Both read and write the same place — `row.category` — so switching presentation never
 * moves data, and the description text is never overwritten by a category again.
 */
export function categoryColumnOf(table: Table): Column | null {
  return (
    table.columns.find((c) => c.type === "category") ??
    table.columns.find((c) => c.withCategory) ??
    null
  );
}

/** Whether this column is where the row's category is picked. */
export function isCategoryColumn(column: Column): boolean {
  return column.type === "category" || !!column.withCategory;
}

/**
 * A row's category for grouping. Prefers the row's own field; falls back to the text of
 * a `withCategory` column so a doc that predates the split (or a hand-edited import)
 * still groups the way it used to.
 */
export function rowCategory(table: Table, row: Row): string {
  if (row.category) return row.category;
  const col = table.columns.find((c) => c.withCategory) ?? table.columns.find((c) => c.category);
  return col ? (row.cells[col.id] ?? "").trim() : "";
}
