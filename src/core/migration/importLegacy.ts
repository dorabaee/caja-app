import {
  type AppDoc,
  type Chart,
  type Column,
  type ColumnType,
  type Month,
  type Project,
  type Row,
  type Table,
  type TableKind,
  type WidgetLayout,
} from "../model/types";
import { defaultSettings, id, twelveMonths } from "../model/defaults";

const LEGACY_DOC_KEY = "caja:v1";

/* eslint-disable @typescript-eslint/no-explicit-any */

function ls(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function asBool(raw: string | null, def = false): boolean {
  if (raw == null) return def;
  const s = raw.replace(/"/g, "").trim().toLowerCase();
  return s === "true" || s === "1";
}

function asString(raw: string | null): string | null {
  if (raw == null) return null;
  return raw.replace(/^"|"$/g, "").trim();
}

function staggerLayout(i: number): WidgetLayout {
  return { x: 24 + (i % 2) * 424, y: 24 + Math.floor(i / 2) * 444, w: 400, h: 420 };
}

function mapKind(kind: unknown, title: string): TableKind {
  const t = title.toLowerCase();
  if (t.includes("libro de cuenta") || t.includes("cuenta bancaria")) return "ledger";
  if (kind === "income" || kind === "expense" || kind === "none" || kind === "ledger") return kind;
  return "none";
}

function mapColumn(c: any, kind: TableKind): Column {
  const type: ColumnType = ["text", "money", "date"].includes(c?.type) ? c.type : "text";
  const col: Column = { id: String(c?.id ?? id()), name: String(c?.name ?? ""), type };
  if (c?.category) col.category = true;
  if (kind === "ledger" && type === "money") {
    const n = col.name.toLowerCase();
    if (n.includes("dep")) col.role = "deposit";
    else if (n.includes("gasto") || n.includes("retiro") || n.includes("salida"))
      col.role = "withdrawal";
  }
  return col;
}

function mapRow(r: any): Row {
  return {
    id: String(r?.id ?? id()),
    cells: r?.cells && typeof r.cells === "object" ? r.cells : {},
    notes: r?.notes && typeof r.notes === "object" ? r.notes : {},
    links: r?.links && typeof r.links === "object" ? r.links : {},
  };
}

function mapTable(t: any, i: number): Table {
  const title = String(t?.title ?? "Tabla");
  const kind = mapKind(t?.kind, title);
  const columns = Array.isArray(t?.columns) ? t.columns.map((c: any) => mapColumn(c, kind)) : [];
  const rows = Array.isArray(t?.rows) ? t.rows.map(mapRow) : [];
  const table: Table = {
    id: String(t?.id ?? id()),
    title,
    kind,
    columns,
    rows,
    layout: t?.layout?.w ? { ...staggerLayout(i), ...t.layout } : staggerLayout(i),
  };
  if (kind === "ledger") table.initialBalance = Number(t?.initialBalance) || 0;
  return table;
}

function mapChart(c: any, i: number): Chart {
  return {
    id: String(c?.id ?? id()),
    type: ["bar", "line", "area", "pie"].includes(c?.type) ? c.type : "bar",
    title: String(c?.title ?? "Gráfica"),
    linkedTableId: c?.linkedTableId ?? null,
    xColumnId: c?.xColumnId ?? null,
    valueColumnId: c?.valueColumnId ?? null,
    layout: c?.layout?.w ? c.layout : { x: 24, y: 24 + i * 360, w: 440, h: 320 },
  };
}

function mapMonth(m: any): Month {
  const tables = Array.isArray(m?.tables) ? m.tables.map(mapTable) : [];
  const charts = Array.isArray(m?.charts) ? m.charts.map(mapChart) : [];
  return { tables, charts };
}

function mapProject(p: any): Project {
  const months = twelveMonths();
  if (Array.isArray(p?.months)) {
    for (let i = 0; i < Math.min(12, p.months.length); i++) months[i] = mapMonth(p.months[i]);
  }
  return {
    id: String(p?.id ?? id()),
    name: String(p?.name ?? "Negocio sin nombre"),
    createdAt: Number(p?.createdAt) || Date.now(),
    initialBalance: Number(p?.initialBalance) || 0,
    carryOver: Boolean(p?.carryOver),
    goal: {},
    recurring: [],
    categories: [],
    months,
  };
}

/**
 * Reads the old app's `caja:v1` localStorage (+ settings keys) once and maps it to
 * an AppDoc. Returns null if there is nothing to import. Non-destructive: the legacy
 * keys are left untouched.
 */
export function importLegacy(): AppDoc | null {
  const raw = ls(LEGACY_DOC_KEY);
  if (!raw) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const projects = parsed?.state?.projects;
  if (!Array.isArray(projects)) return null;

  const settings = defaultSettings();
  const theme = asString(ls("caja:theme"));
  if (theme === "light" || theme === "dark") settings.theme = theme;
  const accent = asString(ls("caja:accent"));
  if (
    accent &&
    ["emerald", "ocean", "grape", "sunset", "cherry", "graphite"].includes(accent)
  ) {
    settings.accent = accent as typeof settings.accent;
  }
  settings.onboarded = asBool(ls("caja:onboarded"), projects.length > 0);
  settings.runTour = asBool(ls("caja:runTour"), false);

  const mapped = projects.map(mapProject);
  return {
    schemaVersion: 1,
    projects: mapped,
    currentProjectId: mapped[0]?.id ?? null,
    settings,
    migratedFromLegacy: true,
  };
}
