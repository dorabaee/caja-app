import { describe, expect, it } from "vitest";
import { makeColumn, makeRow, newAppDoc, twelveMonths } from "@core/model/defaults";
import type { Project, Table, WidgetLayout } from "@core/model/types";
import {
  allBusinessesToCsv,
  buildStatement,
  parseBackup,
  resumenToCsv,
  serializeBackup,
  statementYear,
} from "@core/export";

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
});
