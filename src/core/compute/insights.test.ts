import { describe, expect, it } from "vitest";
import { makeColumn, makeRow, twelveMonths } from "@core/model/defaults";
import type { Month, Project, Table, WidgetLayout } from "@core/model/types";
import { kpiBreakdown, monthlyExpenseCategories } from "@core/compute";

const L: WidgetLayout = { x: 0, y: 0, w: 1, h: 1 };

function money(id: string, title: string, kind: Table["kind"], amounts: number[]): Table {
  const col = makeColumn("Monto", "money");
  const rows = amounts.map((a) => makeRow([col], { [col.id]: String(a) }));
  return { id, title, kind, columns: [col], rows, layout: L };
}

function month(tables: Table[]): Month {
  return { tables, charts: [] };
}

describe("kpiBreakdown", () => {
  it("splits income/expense and excludes ledger & none", () => {
    const m = month([
      money("a", "Ventas", "income", [100, 50]),
      money("b", "Gastos", "expense", [30]),
      money("c", "Banco", "ledger", [9999]),
      money("d", "Otro", "none", [1234]),
    ]);
    const b = kpiBreakdown(m);
    expect(b.income.map((c) => c.tableId)).toEqual(["a"]);
    expect(b.expense.map((c) => c.tableId)).toEqual(["b"]);
    expect(b.entro).toBe(150);
    expect(b.salio).toBe(30);
    expect(b.teQueda).toBe(120);
  });

  it("lists every contributor with its total", () => {
    const m = month([
      money("a", "Ventas A", "income", [100]),
      money("b", "Ventas B", "income", [25]),
    ]);
    const b = kpiBreakdown(m);
    expect(b.income).toEqual([
      { tableId: "a", title: "Ventas A", total: 100, excluded: false },
      { tableId: "b", title: "Ventas B", total: 25, excluded: false },
    ]);
    expect(b.entro).toBe(125);
  });

  it("drops excluded tables from the sums but still lists them", () => {
    const m = month([
      money("a", "Ventas A", "income", [100]),
      money("b", "Ventas B", "income", [25]),
      money("c", "Gastos", "expense", [40]),
    ]);
    const b = kpiBreakdown(m, new Set(["b"]));
    expect(b.entro).toBe(100); // B excluded
    expect(b.income.find((c) => c.tableId === "b")?.excluded).toBe(true);
    expect(b.income).toHaveLength(2);
    expect(b.salio).toBe(40);
    expect(b.teQueda).toBe(60);
  });
});

// Expense table with a category column (Descripción) and [category, amount] rows.
function expenseCatTable(id: string, rows: [string, number][]): Table {
  const desc = makeColumn("Descripción", "text", { withCategory: true });
  const monto = makeColumn("Monto", "money");
  return {
    id,
    title: "Gastos",
    kind: "expense",
    columns: [desc, monto],
    rows: rows.map(([c, v]) => makeRow([desc, monto], { [desc.id]: c, [monto.id]: String(v) })),
    layout: L,
  };
}

describe("monthlyExpenseCategories (#16)", () => {
  it("aggregates expense categories into a 12-month vector, sorted by year total", () => {
    const project: Project = { id: "p", name: "P", createdAt: 0, months: twelveMonths() };
    project.months[0] = {
      tables: [expenseCatTable("e0", [["Renta", 300], ["Luz", 100]])],
      charts: [],
    };
    project.months[1] = {
      tables: [expenseCatTable("e1", [["Renta", 300], ["Agua", 50]])],
      charts: [],
    };
    const rows = monthlyExpenseCategories(project);
    expect(rows.map((r) => r.label)).toEqual(["Renta", "Luz", "Agua"]); // by total desc
    const renta = rows.find((r) => r.label === "Renta")!;
    expect(renta.total).toBe(600);
    expect(renta.byMonth[0]).toBe(300);
    expect(renta.byMonth[1]).toBe(300);
    expect(renta.byMonth[2]).toBe(0);
    expect(rows.find((r) => r.label === "Luz")!.byMonth[0]).toBe(100);
    expect(rows.find((r) => r.label === "Agua")!.byMonth[1]).toBe(50);
  });
});
