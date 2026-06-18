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

/** Table templates (titles/columns mirror the original app). */
export function makeIncomeTable(layout?: Partial<WidgetLayout>): Table {
  const cols = [makeColumn("Día", "text"), makeColumn("Efectivo recibido", "money")];
  const rows = Array.from({ length: 15 }, (_, i) =>
    makeRow(cols, { [cols[0].id]: String(i + 1) }),
  );
  return {
    id: id(),
    title: "Ingresos diarios",
    kind: "income",
    columns: cols,
    rows,
    layout: withLayout(layout),
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
    layout: withLayout(layout),
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
    layout: withLayout({ ...layout, h: 460 }),
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
    layout: withLayout(layout),
  };
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
  linkedTableId: string | null,
  type: ChartType = "bar",
  layout?: Partial<WidgetLayout>,
): Chart {
  return {
    id: id(),
    type,
    title: "Gráfica",
    linkedTableId,
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
    m.tables = [
      makeIncomeTable({ x: 24, y: 24 }),
      makeExpenseTable({ x: 448, y: 24 }),
      makeLedgerTable({ x: 24, y: 468 }),
    ];
  };
  // Seed only the current month by default; others start empty.
  seed(project.months[new Date().getMonth()]);
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
