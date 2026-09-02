import { describe, expect, it } from "vitest";
import { makeColumn, makeRow, newAppDoc, twelveMonths } from "@core/model/defaults";
import type { Chart, Project, Table, WidgetLayout } from "@core/model/types";
import {
  allBusinessesToCsv,
  applyBackup,
  buildStatement,
  createBackup,
  parseBackup,
  resumenToCsv,
  serializeBackup,
  statementYear,
  type ViewPrefs,
} from "@core/export";
import { useStore } from "@core/store/store";
import { useUI } from "@core/store/ui";
import { setPlatform } from "@core/platform";

setPlatform({
  name: "web",
  storage: {
    async readDoc() {
      return null;
    },
    async writeDoc() {
      /* no-op in-memory stub */
    },
  },
  dialog: {
    async saveFile() {
      return false;
    },
    async openFile() {
      return null;
    },
  },
  share: {
    async openExternal() {
      /* no-op */
    },
  },
});

const L: WidgetLayout = { x: 0, y: 0, w: 1, h: 1 };

function incomeTable(values: number[]): Table {
  const day = makeColumn("Día", "text");
  const cash = makeColumn("Efectivo recibido", "money");
  const rows = values.map((v, i) => makeRow([day, cash], { [day.id]: String(i + 1), [cash.id]: String(v) }));
  return { id: "inc", title: "Ingresos diarios", kind: "income", columns: [day, cash], rows, layout: L };
}

function expenseTable(values: number[]): Table {
  const monto = makeColumn("Monto", "money");
  const rows = values.map((v) => makeRow([monto], { [monto.id]: String(v) }));
  return { id: "exp", title: "Gastos", kind: "expense", columns: [monto], rows, layout: L };
}

/** June (index 5) carries the recovered figures: Entró 7020 / Salió 4700 / Saldo 2320. */
function donaRosa(): Project {
  const project: Project = {
    id: "p",
    name: "Tienda de Doña Rosa",
    createdAt: new Date(2026, 5, 1).getTime(),
    months: twelveMonths(),
  };
  project.months[5] = { tables: [incomeTable([3000, 2520, 1500]), expenseTable([200, 1500, 3000])], charts: [] };
  return project;
}

describe("buildStatement", () => {
  it("derives the Estado de resultados numbers from the compute layer", () => {
    const s = buildStatement(donaRosa());
    expect(s.businessName).toBe("Tienda de Doña Rosa");
    expect(s.year).toBe(2026);
    expect(s.totals).toEqual({ entro: 7020, salio: 4700, teQueda: 2320 });
    expect(s.months).toHaveLength(12);
    expect(s.months[5]).toEqual({ monthIndex: 5, entro: 7020, salio: 4700, saldo: 2320 });
    expect(s.bestMonth).toBe(5);
    expect(s.worstMonth).toBe(5);
    expect(s.profitMargin).toBeCloseTo(2320 / 7020, 6);
    expect(s.monthlyAverage).toBeCloseTo(2320 / 12, 6);
    expect(s.positiveMonths).toBe(1);
    expect(s.negativeMonths).toBe(0);
  });

  it("falls back to a placeholder name and the current year", () => {
    const empty: Project = { id: "e", name: "  ", createdAt: 0, months: twelveMonths() };
    const s = buildStatement(empty);
    expect(s.businessName).toBe("Negocio sin nombre");
    expect(s.year).toBe(new Date().getFullYear());
    expect(statementYear({ ...empty, createdAt: new Date(2024, 0, 1).getTime() })).toBe(2024);
  });
});

describe("CSV export", () => {
  it("renders the yearly resumen as RFC-4180 CSV", () => {
    const csv = resumenToCsv(donaRosa());
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Mes,Entró,Salió,Saldo");
    expect(lines[1]).toBe("Enero,0.00,0.00,0.00");
    expect(lines[6]).toBe("Junio,7020.00,4700.00,2320.00");
    expect(lines[13]).toBe("Total del año,7020.00,4700.00,2320.00");
  });

  it("quotes business names that contain commas", () => {
    const a = donaRosa();
    const b: Project = { id: "b", name: "Taller, S.A.", createdAt: a.createdAt, months: twelveMonths() };
    b.months[5] = { tables: [incomeTable([1000])], charts: [] };
    const csv = allBusinessesToCsv([a, b]);
    expect(csv).toContain('"Taller, S.A.",1000.00,0.00,1000.00');
    expect(csv.trim().endsWith("Total,8020.00,4700.00,3320.00")).toBe(true);
  });
});

describe("backup", () => {
  it("round-trips an AppDoc through serialize / parse", () => {
    const doc = newAppDoc();
    doc.projects.push(donaRosa());
    doc.currentProjectId = "p";
    const text = serializeBackup(doc, [], "2026-06-17T00:00:00.000Z");
    const parsed = parseBackup(text);
    expect(parsed.doc).toEqual(doc);
    expect(parsed.blobs).toEqual([]);
    expect(parsed.exportedAt).toBe("2026-06-17T00:00:00.000Z");
  });

  it("rejects files that are not Caja backups", () => {
    expect(() => parseBackup("not json")).toThrow();
    expect(() => parseBackup(JSON.stringify({ app: "other" }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ app: "caja", doc: { nope: true } }))).toThrow();
  });

  it("still parses a legacy backup that carries a base64 blobs array (#13 compat)", () => {
    const doc = newAppDoc();
    doc.projects.push(donaRosa());
    const legacy = {
      app: "caja",
      kind: "backup",
      version: 1,
      schemaVersion: 1,
      exportedAt: "2025-01-01T00:00:00.000Z",
      doc,
      blobs: [{ id: "b1", name: "ticket.png", mime: "image/png", size: 12, data: "AAAA" }],
    };
    const parsed = parseBackup(JSON.stringify(legacy));
    expect(parsed.doc.projects).toHaveLength(1); // doc restores intact
    expect(parsed.blobs).toHaveLength(1); // tolerated, but applyBackup ignores them
    expect(parsed.prefs).toBeUndefined(); // no prefs block written -> none restored
  });

  it("carries every widget's layout and every column's width through a full round-trip", () => {
    const doc = newAppDoc();
    const project = donaRosa();
    const table = project.months[5].tables[0];
    // Pin a distinctive layout and widths so a lossy round-trip is caught, not assumed away.
    table.layout = { x: 12, y: 34, w: 5, h: 7, z: 3 };
    table.columns[0].width = 88;
    table.columns[1].width = 240;
    const chart: Chart = {
      id: "c1",
      type: "bar",
      title: "Ventas",
      linkedTableIds: [table.id],
      layout: { x: 1, y: 2, w: 3, h: 4, z: 1 },
    };
    project.months[5].charts = [chart];
    doc.projects.push(project);
    doc.currentProjectId = "p";

    const prefs: ViewPrefs = { monthIndex: 5, zoom: 1.3, navOrder: ["panel", "month", "resumen", "allBiz"], sidebarCollapsed: true };
    const text = serializeBackup(doc, [], "2026-06-17T00:00:00.000Z", prefs);
    const parsed = parseBackup(text);

    expect(parsed.doc).toEqual(doc);
    const restoredTable = parsed.doc.projects[0].months[5].tables[0];
    expect(restoredTable.layout).toEqual({ x: 12, y: 34, w: 5, h: 7, z: 3 });
    expect(restoredTable.columns[0].width).toBe(88);
    expect(restoredTable.columns[1].width).toBe(240);
    expect(parsed.prefs).toEqual(prefs);
  });

  it("createBackup serializes the live store, not the last-persisted document", async () => {
    const doc = newAppDoc();
    const project = donaRosa();
    doc.projects.push(project);
    doc.currentProjectId = "p";
    useStore.getState().load(doc);
    useUI.getState().setZoom(1.5);

    const text = await createBackup();
    const parsed = parseBackup(text);
    expect(parsed.doc.projects[0].name).toBe("Tienda de Doña Rosa");
    expect(parsed.prefs?.zoom).toBe(1.5);
  });

  it("applyBackup restores the document and, when present, the view prefs", async () => {
    const doc = newAppDoc();
    doc.projects.push(donaRosa());
    doc.currentProjectId = "p";
    const prefs: ViewPrefs = { monthIndex: 3, zoom: 0.8, navOrder: ["resumen", "month", "panel", "allBiz"], sidebarCollapsed: true };
    const parsed = parseBackup(serializeBackup(doc, [], "2026-06-17T00:00:00.000Z", prefs));

    await applyBackup(parsed);

    expect(useUI.getState().monthIndex).toBe(3);
    expect(useUI.getState().zoom).toBe(0.8);
    expect(useUI.getState().sidebarCollapsed).toBe(true);
    expect(useUI.getState().navOrder).toEqual(prefs.navOrder);
  });
});
