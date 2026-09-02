import { describe, expect, it } from "vitest";
import { UNCATEGORIZED, categoryBreakdownForTable, monthlyExpenseCategories } from "@core/compute";
import { makeColumn, makeRow, newProject } from "@core/model/defaults";
import type { Project, Table } from "@core/model/types";

/** An expense table whose description column doubles as the category column. */
function expenseTable(rows: [string, string][]): Table {
  const desc = makeColumn("Descripción", "text", { withCategory: true });
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

describe("categoryBreakdownForTable — description and category are separate fields", () => {
  /** Two different descriptions, one shared category — the case a category column exists for. */
  function twoGasRows(): Table {
    const table = expenseTable([
      ["Gasolina de la camioneta", "600"],
      ["Gasolina personal", "400"],
      ["Cubeta y Trapeador", "870"],
    ]);
    table.rows[0].category = "Gasolina";
    table.rows[1].category = "Gasolina";
    return table;
  }

  it("files both descriptions under the one category they share", () => {
    const slices = categoryBreakdownForTable(twoGasRows(), ["Gasolina"]);
    const byLabel = Object.fromEntries(slices.map((s) => [s.label, s.value]));
    expect(byLabel.Gasolina).toBe(1000);
    expect(byLabel[UNCATEGORIZED]).toBe(870);
  });

  it("still lists the descriptions separately when grouping by description", () => {
    const slices = categoryBreakdownForTable(twoGasRows());
    expect(slices.map((s) => s.label).sort()).toEqual(
      ["Cubeta y Trapeador", "Gasolina de la camioneta", "Gasolina personal"].sort(),
    );
  });

  it("falls back to the cell text for a row that has no category of its own", () => {
    // A doc that predates the split (or a hand-edited import) groups as it always did.
    const slices = categoryBreakdownForTable(expenseTable([["Gasolina", "100"]]), ["Gasolina"]);
    expect(slices).toEqual([{ label: "Gasolina", value: 100 }]);
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

describe("monthlyExpenseCategories — one half of the books at a time", () => {
  function project(): Project {
    const p = newProject("P");
    p.categories = [
      { name: "Gasolina", group: "fiscal" },
      { name: "Extras", group: "noFiscal" },
    ];
    const table = expenseTable([
      ["Gasolina de la camioneta", "600"],
      ["Propina", "70"],
      ["Cubeta y Trapeador", "870"],
    ]);
    table.rows[0].category = "Gasolina";
    table.rows[1].category = "Extras";
    p.months[0].tables = [table];
    return p;
  }

  it("keeps only the fiscal categories", () => {
    const rows = monthlyExpenseCategories(project(), { byCategory: true, group: "fiscal" });
    expect(rows.map((r) => r.label)).toEqual(["Gasolina"]);
    expect(rows[0].total).toBe(600);
  });

  it("keeps only the non-fiscal categories", () => {
    const rows = monthlyExpenseCategories(project(), { byCategory: true, group: "noFiscal" });
    expect(rows.map((r) => r.label)).toEqual(["Extras"]);
  });

  it("shows uncategorised spending only when neither half is asked for", () => {
    const all = monthlyExpenseCategories(project(), { byCategory: true });
    expect(all.map((r) => r.label)).toContain(UNCATEGORIZED);
    for (const g of ["fiscal", "noFiscal"] as const) {
      const half = monthlyExpenseCategories(project(), { byCategory: true, group: g });
      expect(half.map((r) => r.label)).not.toContain(UNCATEGORIZED);
    }
  });
});
