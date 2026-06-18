import { parseMoney } from "../format/money";
import type { Column, Table } from "../model/types";

export interface ChartPoint {
  /** X-axis label / pie slice name. */
  name: string;
  /** Charted money value. */
  value: number;
}

/** The column used for X-axis labels: explicit, else the first text/date column. */
export function chartLabelColumn(table: Table, xColumnId?: string | null): Column | undefined {
  if (xColumnId) {
    const explicit = table.columns.find((c) => c.id === xColumnId);
    if (explicit) return explicit;
  }
  return table.columns.find((c) => c.type === "text" || c.type === "date");
}

/** The money column charted: explicit, else the first money column. */
export function chartValueColumn(table: Table, valueColumnId?: string | null): Column | undefined {
  if (valueColumnId) {
    const explicit = table.columns.find((c) => c.id === valueColumnId);
    if (explicit) return explicit;
  }
  return table.columns.find((c) => c.type === "money");
}

export interface ChartSeriesOptions {
  xColumnId?: string | null;
  valueColumnId?: string | null;
  /** Group rows that share a label and drop empties — used for pie charts. */
  aggregate?: boolean;
}

/**
 * Build chart points from a table.
 * - bar / line / area: one point per row, in order (label = X cell or "Fila N").
 * - pie (aggregate): rows grouped by label, summed, zero/empty values dropped.
 * Returns [] when the table has no money column.
 */
export function chartSeries(table: Table, opts: ChartSeriesOptions = {}): ChartPoint[] {
  const valueCol = chartValueColumn(table, opts.valueColumnId);
  if (!valueCol) return [];
  const labelCol = chartLabelColumn(table, opts.xColumnId);

  const points: ChartPoint[] = table.rows.map((row, i) => {
    const raw = labelCol ? (row.cells[labelCol.id] ?? "").trim() : "";
    return { name: raw || `Fila ${i + 1}`, value: parseMoney(row.cells[valueCol.id]) };
  });

  if (!opts.aggregate) return points;

  const grouped = new Map<string, number>();
  for (const p of points) {
    if (p.value === 0) continue;
    grouped.set(p.name, (grouped.get(p.name) ?? 0) + p.value);
  }
  return [...grouped.entries()].map(([name, value]) => ({ name, value }));
}
