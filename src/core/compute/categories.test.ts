import { describe, expect, it } from "vitest";
import { UNCATEGORIZED, categoryBreakdownForTable, monthlyExpenseCategories } from "@core/compute";
import { makeColumn, makeRow, newProject } from "@core/model/defaults";
import type { Project, Table } from "@core/model/types";

/** An expense table whose description column doubles as the category column. */
function expenseTable(rows: [string, string][]): Table {
  const desc = makeColumn("Descripción", "text", { category: true });
  const monto = makeColumn("Monto", "money");
  const cols = [desc, monto];
  return {
    id: "t1",
    title: "Gastos",
    kind: "expense",
    columns: cols,
    rows: rows.map(([label, amount]) =>
      makeRow(cols, { [desc.id]: label, [monto.id]: amount }),
    ),
    layout: { x: 0, y: 0, w: 400, h: 300 },
  };
}

const SAMPLE: [string, string][] = [
  ["Gasolina", "100"],
  ["gasolina", "50"], // same category, typed in lower case
  ["gas", "45"], // free-typed description, not a category
  ["tel", "784"],
];

describe("categoryBreakdownForTable", () => {
  it("groups by the raw text when no category list is given", () => {
    const slices = categoryBreakdownForTable(expenseTable(SAMPLE));
    expect(slices.map((s) => s.label).sort()).toEqual(["Gasolina", "gas", "gasolina", "tel"]);
  });

  it("folds anything that isn't a known category into 'Sin categoría'", () => {
    const slices = categoryBreakdownForTable(expenseTable(SAMPLE), ["Gasolina", "Servicios"]);
    const byLabel = Object.fromEntries(slices.map((s) => [s.label, s.value]));
    // 100 + 50: the match is case-insensitive and canonicalises to the project's spelling.
    expect(byLabel.Gasolina).toBe(150);
    expect(byLabel[UNCATEGORIZED]).toBe(829); // 45 + 784
    expect(byLabel.gas).toBeUndefined();
  });

  it("ignores rows with no amount", () => {
    const slices = categoryBreakdownForTable(expenseTable([["Gasolina", "0"]]), ["Gasolina"]);
    expect(slices).toEqual([]);
  });
});

describe("monthlyExpenseCategories", () => {
  function project(): Project {
    const p = newProject("P");
    p.categories = [{ name: "Gasolina", group: "fiscal" }];
    p.months[0].tables = [expenseTable(SAMPLE)];
    return p;
  }

  it("keys on the description text by default", () => {
    const rows = monthlyExpenseCategories(project());
    expect(rows.map((r) => r.label).sort()).toEqual(["Gasolina", "gas", "gasolina", "tel"]);
  });

  it("keys on the project's categories with byCategory", () => {
    const rows = monthlyExpenseCategories(project(), { byCategory: true });
    expect(rows.map((r) => r.label).sort()).toEqual([UNCATEGORIZED, "Gasolina"].sort());
    const gas = rows.find((r) => r.label === "Gasolina")!;
    expect(gas.total).toBe(150);
    expect(gas.byMonth[0]).toBe(150);
    expect(gas.byMonth[1]).toBe(0);
  });
});
