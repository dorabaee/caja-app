// Caja domain model — portable, framework-agnostic.

export type ColumnType = "text" | "money" | "date";

/** How a table participates in the monthly Entró / Salió / Te queda totals. */
export type TableKind = "income" | "expense" | "none" | "ledger";

/** Role of a money column inside a ledger ("Libro de cuenta bancaria"). */
export type LedgerRole = "deposit" | "withdrawal";

export type ChartType = "bar" | "stacked" | "line" | "area" | "combo" | "pie";

/** Bank a fiscal table is tagged with, so two fiscal tables stay tellable apart. */
export type BankKey = "banorte" | "santander" | "mercadopago" | "spin" | "bbva" | "coppel";

/** Which half of the chart of accounts a category belongs to. */
export type CategoryGroup = "fiscal" | "noFiscal";

export interface Category {
  name: string;
  /** Unset on categories carried over from before the grouped model. */
  group?: CategoryGroup;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  /** Marks the column whose value is used to group rows into categories. */
  category?: boolean;
  /** Only meaningful for ledger tables. */
  role?: LedgerRole;
  /** User-set fixed width in px (drag the header edge). Unset = flex to fit (#2). */
  width?: number;
}

export interface Row {
  id: string;
  cells: Record<string, string>; // columnId -> raw string value
  notes?: Record<string, string>; // columnId -> note text
  links?: Record<string, string>; // columnId -> url
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
}

export interface Table {
  id: string;
  title: string;
  kind: TableKind;
  columns: Column[];
  rows: Row[];
  layout: WidgetLayout;
  /** Ledger only: starting balance for the month. */
  initialBalance?: number;
  /** Counts toward the month's "Saldo final", and shows a bank tag. Any kind may be one. */
  fiscal?: boolean;
  /** Fiscal only: the bank account this table tracks (a label, not a real connection). */
  bank?: BankKey;
}

export interface Chart {
  id: string;
  type: ChartType;
  title: string;
  /** Tables compared by this chart (one series each). Empty = blank chart. */
  linkedTableIds: string[];
  /** Column used for the X axis / slice labels (defaults to first text/date col). */
  xColumnId?: string | null;
  /** Money column charted (defaults to first money col). */
  valueColumnId?: string | null;
  layout: WidgetLayout;
}

export interface Month {
  tables: Table[];
  charts: Chart[];
}

/** Per-occurrence change to a recurring row in a specific month. */
export interface RecurringOverride {
  /** Hide this occurrence for the month (without ending the series). */
  skip?: boolean;
  /** columnName -> value, overriding the series default for this month only. */
  cells?: Record<string, string>;
}

/** A recurring row applied to a table (matched by title) across a month range. */
export interface RecurringDef {
  id: string;
  tableTitle: string;
  label: string;
  cells: Record<string, string>; // columnName -> value (resolved to ids at expand time)
  fromMonth: number; // 0-11 inclusive
  toMonth: number; // 0-11 inclusive
  /** monthIndex -> per-occurrence override (skip / edited cells). */
  overrides?: Record<number, RecurringOverride>;
}

export interface Goal {
  monthlyProfitTarget?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  initialBalance?: number;
  carryOver?: boolean;
  /** Optional per-project currency override (else app default). */
  currency?: string;
  goal?: Goal;
  recurring?: RecurringDef[];
  categories?: Category[];
  months: Month[]; // always length 12
}

export type ThemeMode = "light" | "dark";
export type AccentName = "emerald" | "ocean" | "grape" | "sunset" | "cherry" | "graphite";
export type ChartPalette = "mono" | "colorful";
export type Locale = "es" | "en";

export interface Settings {
  theme: ThemeMode;
  accent: AccentName;
  chartPalette: ChartPalette;
  locale: Locale;
  currency: string; // ISO-ish code, e.g. "MXN"
  decimals: number; // 0 or 2
  onboarded: boolean;
  runTour: boolean;
}

export interface AppDoc {
  schemaVersion: number;
  projects: Project[];
  currentProjectId: string | null;
  settings: Settings;
  migratedFromLegacy?: boolean;
}

export const CURRENT_SCHEMA_VERSION = 2;
export const MONTHS_PER_YEAR = 12;
