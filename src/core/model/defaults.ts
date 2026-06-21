import { nanoid } from "nanoid";
import {
  type AppDoc,
  type Chart,
  type ChartType,
  type Column,
  type ColumnType,
  type LedgerRole,
  type Month,
  type Project,
  type Row,
  type Settings,
  type Table,
  type TableKind,
  type WidgetLayout,
  CURRENT_SCHEMA_VERSION,
  MONTHS_PER_YEAR,
} from "./types";

export const MONTH_KEYS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const DEFAULT_LAYOUT: WidgetLayout = { x: 24, y: 24, w: 400, h: 420 };

/** Floor for a user-resized table column (px). */
export const MIN_COLUMN_WIDTH = 64;

export function id(): string {
  return nanoid();
}

export function makeColumn(
  name: string,
  type: ColumnType,
  extra?: { category?: boolean; role?: LedgerRole },
): Column {
  return { id: id(), name, type, ...extra };
}

export function makeRow(columns: Column[], values?: Record<string, string>): Row {
  const cells: Record<string, string> = {};
  for (const c of columns) cells[c.id] = values?.[c.id] ?? "";
  return { id: id(), cells, notes: {}, links: {} };
}

export function emptyMonth(): Month {
  return { tables: [], charts: [] };
}

export function twelveMonths(): Month[] {
  return Array.from({ length: MONTHS_PER_YEAR }, emptyMonth);
}

export function defaultSettings(): Settings {
  return {
    theme: "light",
    accent: "emerald",
    chartPalette: "mono",
    locale: "es",
    currency: "MXN",
    decimals: 2,
    onboarded: false,
    runTour: false,
  };
}

function withLayout(partial?: Partial<WidgetLayout>): WidgetLayout {
  return { ...DEFAULT_LAYOUT, ...partial };
}

/**
 * Lay widgets out left-to-right on "shelves" (wrapping at ~maxWidth) and return the
 * top-left slot for a NEW widget appended after `existing`. Now that table defaults
 * vary in size by kind, a fixed count×step grid would overlap a wide ledger — this
 * packs by each widget's real w/h instead. Used by addTable/pasteTable/addChart and
 * the template seed; the user can still re-tidy with "Reacomodar".
 */
export function nextWidgetSlot(
  existing: { layout: WidgetLayout }[],
  size: { w: number; h: number },
  opts?: { pad?: number; gap?: number; maxWidth?: number },
): { x: number; y: number } {
  const pad = opts?.pad ?? 24;
  const gap = opts?.gap ?? 24;
  const maxRight = pad + (opts?.maxWidth ?? 1400);
  let x = pad;
  let y = pad;
  let rowH = 0;
  const advance = (w: number, h: number): { x: number; y: number } => {
    if (x > pad && x + w > maxRight) {
      x = pad;
      y += rowH + gap;
      rowH = 0;
    }
    const slot = { x, y };
    x += w + gap;
    rowH = Math.max(rowH, h);
    return slot;
  };
  for (const it of existing) advance(it.layout.w, it.layout.h);
  return advance(size.w, size.h);
}

/** Number of "Día N" rows seeded into a fresh daily-income table.
 *  Month-agnostic: 28 covers the shortest month; users extend to 29–31 by adding
 *  rows (the day number auto-increments — see addRow). */
export const INCOME_TABLE_DAYS = 28;

/** Table templates (titles/columns mirror the original app). */
export function makeIncomeTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [makeColumn("Día", "text"), makeColumn("Efectivo recibido", "money")];
  const rows = Array.from({ length: INCOME_TABLE_DAYS }, (_, i) =>
    makeRow(cols, { [cols[0].id]: String(i + 1) }),
  );
  return {
    id: id(),
    title: "Ingresos diarios",
    kind: "income",
    columns: cols,
    rows,
    // Narrow: 2 slim columns. 28 day rows can't all fit, so it stays scrollable —
    // sized to show ~7 rows (wide enough that the title + accounting pill aren't clipped).
    layout: withLayout({ w: 400, h: 500, ...layout }),
  };
}

export function makeExpenseTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [
    makeColumn("Fecha", "date"),
    makeColumn("Descripción", "text", { category: true }),
    makeColumn("Monto", "money"),
  ];
  const rows = Array.from({ length: 4 }, () => makeRow(cols));
  return {
    id: id(),
    title: "Gastos",
    kind: "expense",
    columns: cols,
    rows,
    // Wider: 3 columns, gives Descripción room. Height fits the 4 seeded rows +
    // total + footer with no excess / no scroll.
    layout: withLayout({ w: 520, h: 392, ...layout }),
  };
}

export function makeLedgerTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [
    makeColumn("Fecha", "date"),
    makeColumn("Depósito", "money", { role: "deposit" }),
    makeColumn("Importe del gasto", "money", { role: "withdrawal" }),
    makeColumn("Descripción", "text"),
  ];
  const rows = Array.from({ length: 3 }, () => makeRow(cols));
  return {
    id: id(),
    title: "Libro de cuenta bancaria",
    kind: "ledger",
    columns: cols,
    rows,
    initialBalance: 0,
    // Widest: 4 columns (wide enough that "Importe del gasto" + the columns don't
    // side-scroll). Height fits the saldo row + 3 rows + the SALDO FINAL footer with
    // no empty gap.
    layout: withLayout({ w: 640, h: 400, ...layout }),
  };
}

export function makeBlankTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [makeColumn("Concepto", "text"), makeColumn("Monto", "money")];
  const rows = Array.from({ length: 3 }, () => makeRow(cols));
  return {
    id: id(),
    title: "Tabla nueva",
    kind: "none",
    columns: cols,
    rows,
    // Medium: fits the 3 seeded rows + total + footer with no excess.
    layout: withLayout({ w: 400, h: 340, ...layout }),
  };
}

/**
 * Deep-clone a table with fresh table/column/row ids. Cell + note + link maps are
 * remapped onto the new column ids (so they keep binding correctly); with
 * `withData: false` the rows are kept but emptied (structure-only paste). Shared by
 * duplicateTable (#5) and pasteTable (#6).
 */
export function cloneTable(src: Table, opts?: { withData?: boolean; titleSuffix?: string }): Table {
  const withData = opts?.withData ?? true;
  const clone: Table = JSON.parse(JSON.stringify(src));
  clone.id = id();
  if (opts?.titleSuffix) clone.title = `${src.title}${opts.titleSuffix}`;
  clone.columns = clone.columns.map((c) => ({ ...c, id: id() }));
  const idMap = new Map(src.columns.map((c, i) => [c.id, clone.columns[i].id]));
  const remap = (rec?: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    if (rec)
      for (const [oldId, val] of Object.entries(rec)) {
        const nid = idMap.get(oldId);
        if (nid) out[nid] = val;
      }
    return out;
  };
  clone.rows = clone.rows.map((r) => ({
    id: id(),
    cells: withData ? remap(r.cells) : {},
    notes: withData ? remap(r.notes) : {},
    links: withData ? remap(r.links) : {},
  }));
  return clone;
}

/**
 * Deep-clone a whole month (tables + charts) with fresh ids, remapping each chart's
 * links (linkedTableIds + x / value column ids) onto the cloned tables. With
 * `withData: false` the structure is kept but cells/notes/links are emptied and a
 * ledger's starting balance reset — "layout only". Used by copyMonthInto.
 */
export function cloneMonth(src: Month, withData: boolean): Month {
  const colMap = new Map<string, string>();
  const tableMap = new Map<string, string>();
  const remap = (rec?: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    if (rec)
      for (const [k, v] of Object.entries(rec)) {
        const nk = colMap.get(k);
        if (nk) out[nk] = v;
      }
    return out;
  };
  const tables: Table[] = src.tables.map((tbl) => {
    const columns = tbl.columns.map((c) => {
      const nid = id();
      colMap.set(c.id, nid);
      return { ...c, id: nid };
    });
    const newId = id();
    tableMap.set(tbl.id, newId);
    return {
      ...tbl,
      id: newId,
      columns,
      rows: tbl.rows.map((r) => ({
        id: id(),
        cells: withData ? remap(r.cells) : {},
        notes: withData ? remap(r.notes) : {},
        links: withData ? remap(r.links) : {},
      })),
      initialBalance: !withData && tbl.kind === "ledger" ? 0 : tbl.initialBalance,
      layout: { ...tbl.layout },
    };
  });
  const charts: Chart[] = src.charts.map((ch) => ({
    ...ch,
    id: id(),
    linkedTableIds: ch.linkedTableIds
      .map((tid) => tableMap.get(tid))
      .filter((x): x is string => !!x),
    xColumnId: ch.xColumnId ? (colMap.get(ch.xColumnId) ?? null) : ch.xColumnId,
    valueColumnId: ch.valueColumnId ? (colMap.get(ch.valueColumnId) ?? null) : ch.valueColumnId,
    layout: { ...ch.layout },
  }));
  return { tables, charts };
}

export type TemplateKey = "income" | "expense" | "ledger" | "blank";

export function makeTableFromTemplate(template: TemplateKey, layout?: Partial<WidgetLayout>): Table {
  switch (template) {
    case "income":
      return makeIncomeTable(layout);
    case "expense":
      return makeExpenseTable(layout);
    case "ledger":
      return makeLedgerTable(layout);
    case "blank":
      return makeBlankTable(layout);
  }
}

export function makeChart(
  linkedTableIds: string[] = [],
  type: ChartType = "bar",
  layout?: Partial<WidgetLayout>,
): Chart {
  return {
    id: id(),
    type,
    title: "Gráfica",
    linkedTableIds,
    xColumnId: null,
    valueColumnId: null,
    layout: withLayout({ w: 440, h: 320, ...layout }),
  };
}

export function newProject(name = "Negocio sin nombre"): Project {
  return {
    id: id(),
    name,
    createdAt: Date.now(),
    initialBalance: 0,
    carryOver: false,
    goal: {},
    recurring: [],
    categories: [],
    months: twelveMonths(),
  };
}

/** A project pre-filled with the starter tables (used by "Empezar con plantilla"). */
export function newTemplateProject(name = "Negocio sin nombre"): Project {
  const project = newProject(name);
  const seed = (m: Month) => {
    const placed: Table[] = [];
    for (const make of [makeIncomeTable, makeExpenseTable, makeLedgerTable]) {
      const t = make();
      const slot = nextWidgetSlot(placed, t.layout);
      t.layout.x = slot.x;
      t.layout.y = slot.y;
      placed.push(t);
    }
    m.tables = placed;
  };
  // Seed January by default (the natural start of the year); other months start empty.
  seed(project.months[0]);
  return project;
}

export function newAppDoc(): AppDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projects: [],
    currentProjectId: null,
    settings: defaultSettings(),
  };
}

export const TABLE_KIND_LABELS: Record<TableKind, string> = {
  income: "Ingreso",
  expense: "Gasto",
  none: "Otro",
  ledger: "Libro de cuenta",
};
