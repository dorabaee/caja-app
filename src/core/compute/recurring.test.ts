import { describe, expect, it } from "vitest";
import { makeColumn, makeRow, twelveMonths } from "@core/model/defaults";
import type { Project, RecurringDef, Table, WidgetLayout } from "@core/model/types";
import {
  materializeMonth,
  monthlyTotals,
  recurringDefIdFromRowId,
  recurringRowId,
  recurringRowsFor,
  yearlyResumen,
} from "@core/compute";

const L: WidgetLayout = { x: 0, y: 0, w: 1, h: 1 };

function expenseTable(values: number[]): Table {
  const desc = makeColumn("Descripción", "text", { withCategory: true });
  const monto = makeColumn("Monto", "money");
  const rows = values.map((v) => makeRow([desc, monto], { [monto.id]: String(v) }));
  return { id: "exp", title: "Gastos", kind: "expense", columns: [desc, monto], rows, layout: L };
}

function projectWithRecurring(defs: RecurringDef[]): Project {
  const project: Project = {
    id: "p",
    name: "Tienda",
    createdAt: 0,
    recurring: defs,
    months: twelveMonths(),
  };
  // A "Gastos" table in every month so the recurring rows have a host table.
  for (let i = 0; i < 12; i++) project.months[i] = { tables: [expenseTable([])], charts: [] };
  return project;
}

const rentDef: RecurringDef = {
  id: "rent",
  tableTitle: "Gastos",
  label: "Renta",
  cells: { Descripción: "Renta", Monto: "4000" },
  fromMonth: 0,
  toMonth: 11,
};

describe("recurring row ids", () => {
  it("round-trips def id through the synthetic row id", () => {
    const rowId = recurringRowId("rent", 3);
    expect(rowId).toBe("rec-rent-3");
    expect(recurringDefIdFromRowId(rowId)).toBe("rent");
    expect(recurringDefIdFromRowId("real-row")).toBeNull();
  });
});

describe("recurringRowsFor", () => {
  it("materializes one synthetic row per active def, matched by column name", () => {
    const project = projectWithRecurring([rentDef]);
    const table = project.months[2].tables[0];
    const rows = recurringRowsFor(project, 2, table);
    expect(rows).toHaveLength(1);
    const moneyCol = table.columns[1];
    expect(rows[0].cells[moneyCol.id]).toBe("4000");
    expect(rows[0].id).toBe("rec-rent-2");
  });

  it("respects fromMonth/toMonth range", () => {
    const project = projectWithRecurring([{ ...rentDef, fromMonth: 5, toMonth: 7 }]);
    const table = project.months[0].tables[0];
    expect(recurringRowsFor(project, 4, table)).toHaveLength(0);
    expect(recurringRowsFor(project, 6, table)).toHaveLength(1);
    expect(recurringRowsFor(project, 8, table)).toHaveLength(0);
  });

  it("skips an occurrence and applies per-month cell overrides", () => {
    const project = projectWithRecurring([
      { ...rentDef, overrides: { 3: { skip: true }, 4: { cells: { Monto: "4500" } } } },
    ]);
    const table = project.months[0].tables[0];
    expect(recurringRowsFor(project, 3, table)).toHaveLength(0);
    const overridden = recurringRowsFor(project, 4, table)[0];
    expect(overridden.cells[table.columns[1].id]).toBe("4500");
  });
});

describe("recurring flows into totals", () => {
  it("includes recurring amounts in monthly + yearly Salió", () => {
    const project = projectWithRecurring([{ ...rentDef, fromMonth: 0, toMonth: 0 }]);
    // Real recorded expense in January plus the recurring 4000.
    project.months[0] = { tables: [expenseTable([1000])], charts: [] };
    const mat = materializeMonth(project, 0);
    expect(monthlyTotals(mat).salio).toBe(5000);
    const { totals } = yearlyResumen(project);
    expect(totals.salio).toBe(5000);
  });

  it("leaves projects without recurring untouched (same month object)", () => {
    const project: Project = { id: "x", name: "x", createdAt: 0, months: twelveMonths() };
    expect(materializeMonth(project, 0)).toBe(project.months[0]);
  });

  it("counts a recurring row once when two tables share a title", () => {
    const project = projectWithRecurring([{ ...rentDef, fromMonth: 0, toMonth: 0 }]);
    // Two "Gastos" tables in January — the recurring 4000 must inject into ONE.
    project.months[0] = { tables: [expenseTable([1000]), expenseTable([500])], charts: [] };
    const mat = materializeMonth(project, 0);
    // 1000 + 500 (real) + 4000 (recurring, once) = 5500, not 9500.
    expect(monthlyTotals(mat).salio).toBe(5500);
  });
});
