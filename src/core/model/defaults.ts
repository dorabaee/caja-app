import { nanoid } from "nanoid";
import {
  type AppDoc,
  type Category,
  type Chart,
  type ChartType,
  type Column,
  type ColumnType,
  type LedgerRole,
  type Locale,
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
import { normalizeTextCell } from "@core/format/text";

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
  extra?: { withCategory?: boolean; role?: LedgerRole },
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
    hiddenWidgetsLayout: "preserve",
    tableDateMode: "calendar",
    quickAddDateMode: "calendar",
    uppercaseTextCells: true,
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

/**
 * Days in one of the app's month tabs. The workbook is not tied to a calendar year,
 * so February deliberately uses 28 days instead of guessing whether a future year is
 * a leap year.
 */
export function daysInMonth(monthIndex: number): number {
  return new Date(2025, monthIndex + 1, 0).getDate();
}

/** Number of rows in the default January income table (kept for API compatibility). */
export const INCOME_TABLE_DAYS = daysInMonth(0);

/** The welcome-board arrangement used only by guided template businesses. These are
 * canvas units at 100% zoom; the UI opens guided businesses at 80% so the whole welcome
 * composition fits in the first view. Column widths include the table's fixed row-actions
 * track separately (the grid adds that track automatically). */
export const GUIDED_TEMPLATE_LAYOUT = {
  income: { x: 24, y: 24, w: 708, h: 890, columnWidths: [225, 419] },
  ledger: { x: 780, y: 24, w: 1216, h: 448, columnWidths: [207, 184, 253, 508] },
  expense: { x: 780, y: 496, w: 648, h: 392, columnWidths: [150, 286, 148] },
  blank: { x: 24, y: 938, w: 664, h: 376, columnWidths: [462, 138] },
} as const;

function applyGuidedTableLayout(table: Table, layout: (typeof GUIDED_TEMPLATE_LAYOUT)[keyof typeof GUIDED_TEMPLATE_LAYOUT]): void {
  table.layout = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
  layout.columnWidths.forEach((width, index) => {
    const column = table.columns[index];
    if (column) column.width = width;
  });
}

/** Table templates (titles/columns mirror the original app). */
export function makeIncomeTable(layout?: Partial<WidgetLayout>, monthIndex = 0): Table {
  const cols = [makeColumn("Día", "text"), makeColumn("Efectivo recibido", "money")];
  const rows = Array.from({ length: daysInMonth(monthIndex) }, (_, i) =>
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
    layout: withLayout({ w: 708, h: 890, ...layout }),
  };
}

export function makeExpenseTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [
    makeColumn("Fecha", "date"),
    makeColumn("Descripción", "text", { withCategory: true }),
    makeColumn("Monto", "money"),
  ];
  const rows = Array.from({ length: 4 }, () => makeRow(cols));
  return {
    id: id(),
    title: "Contabilidad Personal",
    kind: "expense",
    columns: cols,
    rows,
    // Three readable columns, with just enough height for the 4 seeded rows,
    // total, scrollbar and footer shown in the compact reference.
    layout: withLayout({ w: 648, h: 392, ...layout }),
  };
}

export function makeLedgerTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [
    makeColumn("Fecha", "date"),
    makeColumn("Depósito", "money", { role: "deposit" }),
    makeColumn("Importe del gasto", "money", { role: "withdrawal" }),
    makeColumn("Descripción", "text", { withCategory: true }),
  ];
  const rows = Array.from({ length: 3 }, () => makeRow(cols));
  return {
    id: id(),
    title: "Banco Fiscal",
    kind: "ledger",
    columns: cols,
    rows,
    initialBalance: 0,
    fiscal: true,
    // The widest template, but compact enough to avoid the large empty body below
    // its 3 starter rows while retaining the balance controls and summary footer.
    layout: withLayout({ w: 1216, h: 448, ...layout }),
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
    // Compact: fits the 3 seeded rows, total, scrollbar and footer without a blank gap.
    layout: withLayout({ w: 664, h: 376, ...layout }),
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
    ...(withData && r.category ? { category: r.category } : {}),
    ...(withData && r.categoryGroup ? { categoryGroup: r.categoryGroup } : {}),
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
        ...(withData && r.category ? { category: r.category } : {}),
        ...(withData && r.categoryGroup ? { categoryGroup: r.categoryGroup } : {}),
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

export function makeTableFromTemplate(
  template: TemplateKey,
  layout?: Partial<WidgetLayout>,
  monthIndex = 0,
): Table {
  switch (template) {
    case "income":
      return makeIncomeTable(layout, monthIndex);
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

/**
 * Categories every new project starts with, split into the two halves of the chart of
 * accounts. Users add their own on top (and may delete these); the split only drives how
 * the picker groups them — a cell still stores the plain category name.
 */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { name: "Gasolina", group: "fiscal" },
  { name: "Oficina", group: "fiscal" },
  { name: "Material e insumos", group: "fiscal" },
  { name: "Servicio", group: "fiscal" },
  { name: "Mantenimiento", group: "fiscal" },
  { name: "Seguros", group: "fiscal" },
  { name: "Servicios contables", group: "fiscal" },
  { name: "Productos de limpieza", group: "fiscal" },
  { name: "Luz, agua, internet", group: "fiscal" },
  { name: "Telefonia", group: "fiscal" },
  { name: "Renta", group: "fiscal" },
  { name: "Material de limpieza", group: "fiscal" },
  { name: "Material de insumos", group: "fiscal" },
  { name: "Papelería y oficina", group: "fiscal" },
  { name: "Nóminas", group: "noFiscal" },
  { name: "Mano de obra", group: "noFiscal" },
  { name: "Gastos no facturados", group: "noFiscal" },
  { name: "Extras", group: "noFiscal" },
  { name: "Mantenimiento", group: "noFiscal" },
] as const;

export function defaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
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
    categories: defaultCategories(),
    months: twelveMonths(),
  };
}

/** A project pre-filled with the starter tables (used by "Empezar con plantilla"). */
export function newTemplateProject(
  name = "Negocio sin nombre",
  options: { uppercaseTextCells?: boolean; locale?: Locale } = {},
): Project {
  const project = newProject(name);
  const seed = (m: Month) => {
    const placed: Table[] = [];
    const income = makeIncomeTable();
    const expense = makeExpenseTable();
    const ledger = makeLedgerTable();
    const blank = makeBlankTable();

    // A small, coherent example is easier to learn from than a wall of identical
    // generated numbers. Values are fixed deliberately: totals remain explainable and
    // tests can prove the four tables agree with the figures shown in the tour.
    const incomeMoney = income.columns.find((c) => c.type === "money")!;
    ["1250", "980", "1435", "760", "1640", "1290", "1115"].forEach((value, i) => {
      income.rows[i].cells[incomeMoney.id] = value;
    });

    const [expenseDate, expenseDescription, expenseMoney] = expense.columns;
    const expenseSamples = [
      ["2026-01-03", "Compra de insumos", "980", "Material e insumos"],
      ["2026-01-05", "Internet del negocio", "650", "Luz, agua, internet"],
      ["2026-01-06", "Papelería", "220", "Papelería y oficina"],
      ["2026-01-07", "Servicio de reparto", "350", "Servicio"],
    ];
    expenseSamples.forEach(([date, description, amount, category], i) => {
      Object.assign(expense.rows[i].cells, {
        [expenseDate.id]: date,
        [expenseDescription.id]: description,
        [expenseMoney.id]: amount,
      });
      expense.rows[i].category = category;
      expense.rows[i].categoryGroup = "fiscal";
    });

    ledger.initialBalance = 5000;
    const [ledgerDate, ledgerDeposit, ledgerExpense, ledgerDescription] = ledger.columns;
    const ledgerSamples = [
      ["2026-01-03", "3000", "", "Depósito de ventas"],
      ["2026-01-05", "", "650", "Pago de internet"],
      ["2026-01-06", "", "980", "Compra de insumos"],
    ];
    ledgerSamples.forEach(([date, deposit, withdrawal, description], i) => {
      Object.assign(ledger.rows[i].cells, {
        [ledgerDate.id]: date,
        [ledgerDeposit.id]: deposit,
        [ledgerExpense.id]: withdrawal,
        [ledgerDescription.id]: description,
      });
    });

    blank.title = "Metas y apartados";
    const [blankConcept, blankAmount] = blank.columns;
    [["Fondo para imprevistos", "1500"], ["Próximo mantenimiento", "800"], ["Compra de equipo", "2500"]]
      .forEach(([concept, amount], i) => {
        blank.rows[i].cells[blankConcept.id] = concept;
        blank.rows[i].cells[blankAmount.id] = amount;
      });

    applyGuidedTableLayout(income, GUIDED_TEMPLATE_LAYOUT.income);
    applyGuidedTableLayout(ledger, GUIDED_TEMPLATE_LAYOUT.ledger);
    applyGuidedTableLayout(expense, GUIDED_TEMPLATE_LAYOUT.expense);
    applyGuidedTableLayout(blank, GUIDED_TEMPLATE_LAYOUT.blank);
    placed.push(income, expense, ledger, blank);
    m.tables = placed;
  };
  // Seed January by default (the natural start of the year); other months start empty.
  seed(project.months[0]);
  if (options.uppercaseTextCells) {
    const locale = options.locale ?? "es";
    for (const table of project.months[0].tables) {
      const textColumnIds = new Set(table.columns.filter((column) => column.type === "text").map((column) => column.id));
      for (const row of table.rows) {
        for (const columnId of textColumnIds) {
          row.cells[columnId] = normalizeTextCell(row.cells[columnId] ?? "", true, locale);
        }
      }
    }
  }
  project.onboarding = { starterMode: "sample", tourCompleted: false, sampleDataPresent: true };
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
