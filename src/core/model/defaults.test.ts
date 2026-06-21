import { describe, expect, it } from "vitest";
import {
  INCOME_TABLE_DAYS,
  cloneTable,
  makeBlankTable,
  makeColumn,
  makeExpenseTable,
  makeIncomeTable,
  makeLedgerTable,
  makeRow,
  nextWidgetSlot,
} from "@core/model/defaults";
import type { Table } from "@core/model/types";

function sampleTable(): Table {
  const dia = makeColumn("Día", "text");
  const monto = makeColumn("Monto", "money");
  const row = makeRow([dia, monto], { [dia.id]: "1", [monto.id]: "100" });
  row.notes = { [monto.id]: "nota" };
  row.links = { [dia.id]: "ref" };
  return {
    id: "t",
    title: "Tabla",
    kind: "income",
    columns: [dia, monto],
    rows: [row],
    layout: { x: 0, y: 0, w: 1, h: 1 },
  };
}

describe("makeIncomeTable", () => {
  it("seeds a full month of day rows (>= 28)", () => {
    const t = makeIncomeTable();
    expect(t.rows.length).toBe(INCOME_TABLE_DAYS);
    expect(INCOME_TABLE_DAYS).toBeGreaterThanOrEqual(28);
  });

  it("fills the Día column with sequential numbers 1..N", () => {
    const t = makeIncomeTable();
    const dia = t.columns[0];
    const days = t.rows.map((r) => r.cells[dia.id]);
    expect(days[0]).toBe("1");
    expect(days[days.length - 1]).toBe(String(INCOME_TABLE_DAYS));
    // strictly increasing by 1
    for (let i = 1; i < days.length; i++) {
      expect(Number(days[i]) - Number(days[i - 1])).toBe(1);
    }
  });

  it("leaves the cash column empty in seeded rows", () => {
    const t = makeIncomeTable();
    const cash = t.columns[1];
    expect(t.rows.every((r) => r.cells[cash.id] === "")).toBe(true);
  });
});

describe("makeExpenseTable", () => {
  it("marks one category column", () => {
    const t = makeExpenseTable();
    expect(t.columns.filter((c) => c.category).length).toBe(1);
  });
});

describe("table default sizes", () => {
  it("gives each kind its own default dimensions", () => {
    expect(makeIncomeTable().layout).toMatchObject({ w: 400, h: 560 });
    expect(makeExpenseTable().layout).toMatchObject({ w: 520, h: 420 });
    expect(makeLedgerTable().layout).toMatchObject({ w: 620, h: 500 });
    expect(makeBlankTable().layout).toMatchObject({ w: 400, h: 420 });
  });

  it("lets the caller override position while keeping the kind's size", () => {
    expect(makeIncomeTable({ x: 100, y: 200 }).layout).toMatchObject({
      x: 100,
      y: 200,
      w: 400,
      h: 560,
    });
    // ...and an explicit size still wins (spread comes last in the makers).
    expect(makeLedgerTable({ w: 700 }).layout.w).toBe(700);
  });
});

describe("nextWidgetSlot", () => {
  const overlaps = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it("places the first widget at the padding origin", () => {
    expect(nextWidgetSlot([], { w: 360, h: 560 })).toEqual({ x: 24, y: 24 });
  });

  it("packs left-to-right then wraps to a new shelf without overlapping", () => {
    const income = { layout: { x: 24, y: 24, w: 360, h: 560 } };
    const expense = { layout: { x: 408, y: 24, w: 520, h: 420 } };
    // A 620-wide ledger no longer fits on row 1 → wraps below the tallest tile.
    const slot = nextWidgetSlot([income, expense], { w: 620, h: 500 });
    expect(slot).toEqual({ x: 24, y: 608 });
    expect(overlaps({ ...slot, w: 620, h: 500 }, income.layout)).toBe(false);
    expect(overlaps({ ...slot, w: 620, h: 500 }, expense.layout)).toBe(false);
  });
});

describe("cloneTable", () => {
  it("with data: fresh ids, remapped cells/notes/links", () => {
    const src = sampleTable();
    const c = cloneTable(src, { withData: true, titleSuffix: " (copia)" });
    expect(c.id).not.toBe(src.id);
    expect(c.title).toBe("Tabla (copia)");
    expect(c.columns.map((x) => x.id)).not.toEqual(src.columns.map((x) => x.id));
    const [cDia, cMonto] = c.columns;
    expect(c.rows[0].cells[cDia.id]).toBe("1");
    expect(c.rows[0].cells[cMonto.id]).toBe("100");
    expect(c.rows[0].notes?.[cMonto.id]).toBe("nota");
    expect(c.rows[0].links?.[cDia.id]).toBe("ref");
  });

  it("structure only: same shape, emptied cells/notes/links", () => {
    const src = sampleTable();
    const c = cloneTable(src, { withData: false });
    expect(c.columns).toHaveLength(src.columns.length);
    expect(c.rows).toHaveLength(src.rows.length);
    expect(c.rows[0].cells).toEqual({});
    expect(c.rows[0].notes).toEqual({});
    expect(c.rows[0].links).toEqual({});
  });
});
