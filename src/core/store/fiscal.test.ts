import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@core/store/store";
import { makeColumn, makeRow, newAppDoc, newProject } from "@core/model/defaults";
import { fiscalTotal, hasFiscalTable } from "@core/compute";
import type { AppDoc, Table } from "@core/model/types";

function seedDoc(): AppDoc {
  const fecha = makeColumn("Fecha", "date");
  const desc = makeColumn("Descripción", "text");
  const monto = makeColumn("Monto", "money");
  const cols = [fecha, desc, monto];
  const rows = ["a", "b", "c"].map((label, i) => {
    const row = makeRow(cols, { [desc.id]: label, [monto.id]: String((i + 1) * 100) });
    row.id = label;
    row.notes = { [monto.id]: `nota ${label}` };
    row.links = { [desc.id]: `link ${label}` };
    return row;
  });
  const table: Table = {
    id: "t1",
    title: "Banco Fiscal",
    kind: "ledger",
    columns: cols,
    rows,
    layout: { x: 0, y: 0, w: 400, h: 300 },
  };
  const project = newProject("Negocio");
  project.id = "p1";
  project.months[0].tables = [table];
  return { ...newAppDoc(), projects: [project], currentProjectId: "p1" };
}

const table = () => useStore.getState().doc.projects[0].months[0].tables[0];

beforeEach(() => useStore.getState().load(seedDoc()));

describe("setRowOrder (#2)", () => {
  it("reorders rows to match the given ids", () => {
    useStore.getState().setRowOrder(0, "t1", ["c", "a", "b"]);
    expect(table().rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps the row's own cells with it", () => {
    const descId = table().columns[1].id;
    useStore.getState().setRowOrder(0, "t1", ["c", "b", "a"]);
    expect(table().rows.map((r) => r.cells[descId])).toEqual(["c", "b", "a"]);
  });

  it("parks rows the caller didn't mention at the end instead of dropping them", () => {
    useStore.getState().setRowOrder(0, "t1", ["c", "a"]);
    expect(table().rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("ignores ids that no longer exist", () => {
    useStore.getState().setRowOrder(0, "t1", ["gone", "b", "a", "c"]);
    expect(table().rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("removeColumns (#5)", () => {
  it("drops several columns in one undoable step", () => {
    const [fecha, , monto] = table().columns;
    useStore.getState().removeColumns(0, "t1", [fecha.id, monto.id]);
    expect(table().columns.map((c) => c.name)).toEqual(["Descripción"]);
    expect(useStore.getState().canUndo()).toBe(true);
    useStore.getState().undo();
    expect(table().columns).toHaveLength(3);
  });

  it("clears the deleted column's cells, notes and links", () => {
    const monto = table().columns[2];
    useStore.getState().removeColumns(0, "t1", [monto.id]);
    for (const row of table().rows) {
      expect(monto.id in row.cells).toBe(false);
      expect(row.notes?.[monto.id]).toBeUndefined();
      expect(row.links?.[monto.id]).toBeUndefined();
    }
  });

  it("refuses to leave a table with no columns", () => {
    useStore.getState().removeColumns(0, "t1", table().columns.map((c) => c.id));
    expect(table().columns).toHaveLength(3);
  });
});

describe("fiscal flag + bank tag (#1)", () => {
  it("marks a table fiscal and tags it with a bank", () => {
    useStore.getState().setTableFiscal(0, "t1", true);
    useStore.getState().setTableBank(0, "t1", "banorte");
    expect(table().fiscal).toBe(true);
    expect(table().bank).toBe("banorte");
  });

  it("drops the bank when the table stops being fiscal", () => {
    useStore.getState().setTableFiscal(0, "t1", true);
    useStore.getState().setTableBank(0, "t1", "bbva");
    useStore.getState().setTableFiscal(0, "t1", false);
    expect(table().fiscal).toBeUndefined();
    expect(table().bank).toBeUndefined();
  });
});

describe("setColumnOrder (#2)", () => {
  it("reorders columns to match the given ids", () => {
    const [fecha, desc, monto] = table().columns;
    useStore.getState().setColumnOrder(0, "t1", [desc.id, monto.id, fecha.id]);
    expect(table().columns.map((c) => c.name)).toEqual(["Descripción", "Monto", "Fecha"]);
  });

  it("keeps every cell bound to its own column", () => {
    const [fecha, desc, monto] = table().columns;
    const before = table().rows.map((r) => r.cells[desc.id]);
    useStore.getState().setColumnOrder(0, "t1", [monto.id, desc.id, fecha.id]);
    expect(table().rows.map((r) => r.cells[desc.id])).toEqual(before);
  });

  it("parks columns the caller didn't mention at the end instead of dropping them", () => {
    const [fecha, , monto] = table().columns;
    useStore.getState().setColumnOrder(0, "t1", [monto.id, fecha.id]);
    expect(table().columns.map((c) => c.name)).toEqual(["Monto", "Fecha", "Descripción"]);
  });
});

describe("fiscalTotal (#1)", () => {
  it("adds up only the tables marked fiscal", () => {
    const montoId = table().columns[2].id;
    for (const row of table().rows) {
      useStore.getState().setCell(0, "t1", row.id, montoId, "100");
    }
    const month = () => useStore.getState().doc.projects[0].months[0];
    expect(fiscalTotal(month())).toBe(0);
    useStore.getState().setTableFiscal(0, "t1", true);
    // A ledger with no deposit/withdrawal roles nets its money columns.
    expect(fiscalTotal(month())).toBe(300);
    expect(hasFiscalTable(month())).toBe(true);
  });
});
