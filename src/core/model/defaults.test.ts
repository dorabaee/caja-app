import { describe, expect, it } from "vitest";
import {
  INCOME_TABLE_DAYS,
  GUIDED_TEMPLATE_LAYOUT,
  cloneMonth,
  cloneTable,
  daysInMonth,
  makeBlankTable,
  makeChart,
  makeColumn,
  makeExpenseTable,
  makeIncomeTable,
  makeLedgerTable,
  makeRow,
  newTemplateProject,
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
  it("seeds every day of the selected month", () => {
    const t = makeIncomeTable();
    expect(t.rows.length).toBe(INCOME_TABLE_DAYS);
    expect(INCOME_TABLE_DAYS).toBe(31);
  });

  it("uses 28, 30, or 31 rows according to the selected month", () => {
    expect(daysInMonth(1)).toBe(28); // February
    expect(makeIncomeTable(undefined, 1).rows).toHaveLength(28);
    expect(makeIncomeTable(undefined, 3).rows).toHaveLength(30); // April
    expect(makeIncomeTable(undefined, 4).rows).toHaveLength(31); // May
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

describe("newTemplateProject", () => {
  it("seeds four deterministic teaching tables with coherent values", () => {
    const project = newTemplateProject("Ejemplo");
    const tables = project.months[0].tables;
    expect(tables.map((table) => table.kind)).toEqual(["income", "expense", "ledger", "none"]);
    expect(project.onboarding).toEqual({ starterMode: "sample", tourCompleted: false, sampleDataPresent: true });
    const income = tables[0];
    const incomeMoney = income.columns.find((column) => column.type === "money")!;
    expect(income.rows.reduce((sum, row) => sum + Number(row.cells[incomeMoney.id] || 0), 0)).toBe(8470);
    const ledger = tables[2];
    expect(ledger.initialBalance).toBe(5000);
    expect(tables[3].title).toBe("Metas y apartados");
  });

  it("uppercases generated text-cell values when the preference is enabled", () => {
    const project = newTemplateProject("Ejemplo", { uppercaseTextCells: true, locale: "es" });
    const expense = project.months[0].tables.find((table) => table.kind === "expense")!;
    const description = expense.columns.find((column) => column.name === "Descripción")!;
    expect(expense.rows[0].cells[description.id]).toBe("COMPRA DE INSUMOS");

    const blank = project.months[0].tables.find((table) => table.title === "Metas y apartados")!;
    const concept = blank.columns.find((column) => column.name === "Concepto")!;
    expect(blank.rows[0].cells[concept.id]).toBe("FONDO PARA IMPREVISTOS");
  });

  it("keeps the current mixed casing when the preference is disabled", () => {
    const project = newTemplateProject("Ejemplo", { uppercaseTextCells: false, locale: "es" });
    const expense = project.months[0].tables.find((table) => table.kind === "expense")!;
    const description = expense.columns.find((column) => column.name === "Descripción")!;
    expect(expense.rows[0].cells[description.id]).toBe("Compra de insumos");
  });

  it("leaves every month after January empty", () => {
    const project = newTemplateProject();
    expect(project.months.slice(1).every((month) => !month.tables.length && !month.charts.length)).toBe(true);
  });

  it("uses the dedicated welcome-board layout without changing standalone defaults", () => {
    const project = newTemplateProject("Ejemplo");
    const tables = project.months[0].tables;
    expect(tables.map((table) => table.layout)).toEqual([
      expect.objectContaining({ x: 24, y: 24, w: 708, h: 890 }),
      expect.objectContaining({ x: 780, y: 496, w: 648, h: 392 }),
      expect.objectContaining({ x: 780, y: 24, w: 1216, h: 448 }),
      expect.objectContaining({ x: 24, y: 938, w: 664, h: 376 }),
    ]);
    expect(tables.map((table) => table.columns.map((column) => column.width))).toEqual([
      GUIDED_TEMPLATE_LAYOUT.income.columnWidths,
      GUIDED_TEMPLATE_LAYOUT.expense.columnWidths,
      GUIDED_TEMPLATE_LAYOUT.ledger.columnWidths,
      GUIDED_TEMPLATE_LAYOUT.blank.columnWidths,
    ]);
  });
});

describe("makeExpenseTable", () => {
  it("marks one category column", () => {
    const t = makeExpenseTable();
    expect(t.columns.filter((c) => c.withCategory).length).toBe(1);
  });
});

describe("table default sizes", () => {
  it("gives each kind its own default dimensions", () => {
    expect(makeIncomeTable().layout).toMatchObject({ w: 708, h: 890 });
    expect(makeExpenseTable().layout).toMatchObject({ w: 648, h: 392 });
    expect(makeLedgerTable().layout).toMatchObject({ w: 1216, h: 448 });
    expect(makeBlankTable().layout).toMatchObject({ w: 664, h: 376 });
  });

  it("lets the caller override position while keeping the kind's size", () => {
    expect(makeIncomeTable({ x: 100, y: 200 }).layout).toMatchObject({
      x: 100,
      y: 200,
      w: 708,
      h: 890,
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

describe("cloneMonth", () => {
  it("clones tables + charts with fresh ids and remaps chart links onto the clones", () => {
    const table = makeIncomeTable();
    table.id = "t1";
    const chart = makeChart(["t1"], "bar");
    chart.xColumnId = table.columns[0].id;
    chart.valueColumnId = table.columns[1].id;

    const clone = cloneMonth({ tables: [table], charts: [chart] }, true);
    const ct = clone.tables[0];
    expect(ct.id).not.toBe("t1");
    expect(ct.columns.map((c) => c.id)).not.toEqual(table.columns.map((c) => c.id));
    expect(clone.charts[0].id).not.toBe(chart.id);
    expect(clone.charts[0].linkedTableIds).toEqual([ct.id]);
    expect(clone.charts[0].xColumnId).toBe(ct.columns[0].id);
    expect(clone.charts[0].valueColumnId).toBe(ct.columns[1].id);
  });

  it("layout-only (withData:false) keeps the structure but empties cell data", () => {
    const table = makeExpenseTable();
    const moneyCol = table.columns.find((c) => c.type === "money")!;
    table.rows[0].cells[moneyCol.id] = "100";
    const clone = cloneMonth({ tables: [table], charts: [] }, false);
    expect(clone.tables[0].rows).toHaveLength(table.rows.length);
    expect(clone.tables[0].rows[0].cells).toEqual({});
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
