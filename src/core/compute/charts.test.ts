import { describe, expect, it } from "vitest";
import { makeColumn, makeRow } from "@core/model/defaults";
import type { Table, WidgetLayout } from "@core/model/types";
import { chartPieMulti, chartSeries, chartSeriesMulti } from "@core/compute";

const L: WidgetLayout = { x: 0, y: 0, w: 1, h: 1 };

function expenseTable(rows: { fecha?: string; desc?: string; monto: number | "" }[]): Table {
  const fecha = makeColumn("Fecha", "date");
  const desc = makeColumn("Descripción", "text", { category: true });
  const monto = makeColumn("Monto", "money");
  return {
    id: "exp",
    title: "Gastos",
    kind: "expense",
    columns: [fecha, desc, monto],
    rows: rows.map((r) =>
      makeRow([fecha, desc, monto], {
        [fecha.id]: r.fecha ?? "",
        [desc.id]: r.desc ?? "",
        [monto.id]: r.monto === "" ? "" : String(r.monto),
      }),
    ),
    layout: L,
  };
}

describe("chartSeries", () => {
  it("maps one point per row, X = first text/date col, value = first money col", () => {
    const t = expenseTable([
      { fecha: "2026-06-03", desc: "Luz", monto: 200 },
      { fecha: "2026-06-08", desc: "Mercancía", monto: 1500 },
      { fecha: "2026-06-20", desc: "Renta", monto: 3000 },
    ]);
    expect(chartSeries(t)).toEqual([
      { name: "2026-06-03", value: 200 },
      { name: "2026-06-08", value: 1500 },
      { name: "2026-06-20", value: 3000 },
    ]);
  });

  it('falls back to "Fila N" for an empty label cell and keeps empty rows', () => {
    const t = expenseTable([
      { fecha: "2026-06-03", desc: "Luz", monto: 200 },
      { monto: "" },
    ]);
    expect(chartSeries(t)).toEqual([
      { name: "2026-06-03", value: 200 },
      { name: "Fila 2", value: 0 },
    ]);
  });

  it("respects explicit x/value column ids", () => {
    const t = expenseTable([{ fecha: "2026-06-03", desc: "Luz", monto: 200 }]);
    const descId = t.columns[1].id;
    expect(chartSeries(t, { xColumnId: descId })[0].name).toBe("Luz");
  });

  it("aggregates by label and drops zero rows for pie", () => {
    const t = expenseTable([
      { desc: "Luz", monto: 200 },
      { desc: "Luz", monto: 100 },
      { desc: "Renta", monto: 3000 },
      { desc: "Vacío", monto: "" },
    ]);
    const cat = t.columns[1].id;
    expect(chartSeries(t, { xColumnId: cat, aggregate: true })).toEqual([
      { name: "Luz", value: 300 },
      { name: "Renta", value: 3000 },
    ]);
  });

  it("returns [] when there is no money column", () => {
    const onlyText = makeColumn("Nota", "text");
    const t: Table = {
      id: "t",
      title: "x",
      kind: "none",
      columns: [onlyText],
      rows: [makeRow([onlyText], { [onlyText.id]: "hola" })],
      layout: L,
    };
    expect(chartSeries(t)).toEqual([]);
  });
});

// Simple [text label, money] table so the default label column is the text col.
function catTable(id: string, title: string, rows: [string, number][]): Table {
  const cat = makeColumn("Categoría", "text");
  const monto = makeColumn("Monto", "money");
  return {
    id,
    title,
    kind: "expense",
    columns: [cat, monto],
    rows: rows.map(([c, v]) => makeRow([cat, monto], { [cat.id]: c, [monto.id]: String(v) })),
    layout: L,
  };
}

describe("chartSeriesMulti (#9)", () => {
  it("one series per table, rows merged by label union", () => {
    const a = catTable("a", "Local A", [
      ["Luz", 100],
      ["Renta", 300],
    ]);
    const b = catTable("b", "Local B", [
      ["Renta", 500],
      ["Agua", 50],
    ]);
    const { rows, series } = chartSeriesMulti([a, b]);
    expect(series).toEqual([
      { key: "a", name: "Local A" },
      { key: "b", name: "Local B" },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Luz", "Renta", "Agua"]);
    const renta = rows.find((r) => r.name === "Renta")!;
    expect(renta.a).toBe(300);
    expect(renta.b).toBe(500);
    const agua = rows.find((r) => r.name === "Agua")!;
    expect(agua.a).toBeUndefined(); // A has no "Agua" row
    expect(agua.b).toBe(50);
  });

  it("sums rows that share a label within one table", () => {
    const a = catTable("a", "A", [
      ["Luz", 100],
      ["Luz", 25],
    ]);
    const { rows } = chartSeriesMulti([a]);
    expect(rows).toEqual([{ name: "Luz", a: 125 }]);
  });
});

describe("chartPieMulti (#9)", () => {
  it("aggregates every table's slices by label", () => {
    const a = catTable("a", "A", [["Luz", 100]]);
    const b = catTable("b", "B", [
      ["Luz", 50],
      ["Renta", 200],
    ]);
    expect(chartPieMulti([a, b])).toEqual([
      { name: "Luz", value: 150 },
      { name: "Renta", value: 200 },
    ]);
  });
});
