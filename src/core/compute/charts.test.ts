import { describe, expect, it } from "vitest";
import { makeColumn, makeRow } from "@core/model/defaults";
import type { Table, WidgetLayout } from "@core/model/types";
import { chartSeries } from "@core/compute";

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
