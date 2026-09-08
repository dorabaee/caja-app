import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@core/store/store";
import { makeColumn, makeRow, newAppDoc, newProject } from "@core/model/defaults";
import type { AppDoc, Table } from "@core/model/types";

function seedDoc(): { doc: AppDoc; table: Table } {
  const dia = makeColumn("Día", "text");
  const monto = makeColumn("Monto", "money");
  const row = makeRow([dia, monto], { [dia.id]: "1", [monto.id]: "100" });
  row.notes = { [monto.id]: "una nota" };
  row.links = { [dia.id]: "ref-123" };
  const table: Table = {
    id: "t1",
    title: "Ventas",
    kind: "income",
    columns: [dia, monto],
    rows: [row],
    layout: { x: 10, y: 20, w: 300, h: 200 },
  };
  const project = newProject("Negocio");
  project.id = "p1";
  project.months[0].tables = [table];
  const doc: AppDoc = { ...newAppDoc(), projects: [project], currentProjectId: "p1" };
  return { doc, table };
}

describe("duplicateTable (#5)", () => {
  beforeEach(() => {
    const { doc } = seedDoc();
    useStore.getState().load(doc);
  });

  it("returns the new table id and appends a clone", () => {
    const newId = useStore.getState().duplicateTable(0, "t1");
    const month = useStore.getState().doc.projects[0].months[0];
    expect(typeof newId).toBe("string");
    expect(month.tables).toHaveLength(2);
    const clone = month.tables.find((t) => t.id === newId);
    expect(clone).toBeTruthy();
    expect(clone!.title).toBe("Ventas (copia)");
    expect(clone!.id).not.toBe("t1");
    expect(clone!.layout).toEqual({ x: 42, y: 52, w: 300, h: 200 });
  });

  it("gives the clone fresh column + row ids", () => {
    const newId = useStore.getState().duplicateTable(0, "t1");
    const month = useStore.getState().doc.projects[0].months[0];
    const src = month.tables[0];
    const clone = month.tables.find((t) => t.id === newId)!;
    expect(clone.columns.map((c) => c.id)).not.toEqual(src.columns.map((c) => c.id));
    expect(clone.rows[0].id).not.toBe(src.rows[0].id);
  });

  it("remaps cells, notes AND links onto the new column ids (not blanked)", () => {
    const newId = useStore.getState().duplicateTable(0, "t1");
    const month = useStore.getState().doc.projects[0].months[0];
    const clone = month.tables.find((t) => t.id === newId)!;
    const [cDia, cMonto] = clone.columns;
    const r = clone.rows[0];
    expect(r.cells[cDia.id]).toBe("1");
    expect(r.cells[cMonto.id]).toBe("100");
    expect(r.notes?.[cMonto.id]).toBe("una nota"); // remapped, not {}
    expect(r.links?.[cDia.id]).toBe("ref-123"); // remapped, not {}
  });

  it("does not mutate the source table", () => {
    useStore.getState().duplicateTable(0, "t1");
    const src = useStore.getState().doc.projects[0].months[0].tables[0];
    expect(src.id).toBe("t1");
    expect(src.title).toBe("Ventas");
    expect(src.rows[0].cells[src.columns[0].id]).toBe("1");
  });
});

describe("setProjectOrder", () => {
  function multiDoc(): AppDoc {
    const mk = (id: string, name: string) => {
      const p = newProject(name);
      p.id = id;
      return p;
    };
    return { ...newAppDoc(), projects: [mk("a", "A"), mk("b", "B"), mk("c", "C")], currentProjectId: "a" };
  }
  beforeEach(() => useStore.getState().load(multiDoc()));

  it("reorders the businesses to match the given id list", () => {
    useStore.getState().setProjectOrder(["c", "a", "b"]);
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("appends ids missing from the list at the end (in their original order)", () => {
    useStore.getState().setProjectOrder(["c"]);
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("is undoable", () => {
    useStore.getState().setProjectOrder(["b", "c", "a"]);
    useStore.getState().undo();
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("business duplication", () => {
  beforeEach(() => {
    const { doc } = seedDoc();
    useStore.getState().load(doc);
  });

  it("copies the complete business with fresh nested ids and selects the copy", () => {
    const duplicateId = useStore.getState().duplicateProject("p1");
    const state = useStore.getState().doc;
    expect(state.projects).toHaveLength(2);
    expect(state.currentProjectId).toBe(duplicateId);
    const source = state.projects[0];
    const duplicate = state.projects[1];
    expect(duplicate.name).toBe("Negocio (copia)");
    expect(duplicate.months[0].tables[0].rows[0].cells[duplicate.months[0].tables[0].columns[1].id]).toBe("100");
    expect(duplicate.months[0].tables[0].id).not.toBe(source.months[0].tables[0].id);
    expect(duplicate.months[0].tables[0].columns[0].id).not.toBe(source.months[0].tables[0].columns[0].id);
  });
});

describe("spreadsheet fill shortcuts", () => {
  beforeEach(() => {
    const { doc, table } = seedDoc();
    const [day, amount] = table.columns;
    table.columns.push(makeColumn("Otro monto", "money"));
    table.rows.push(makeRow(table.columns, { [day.id]: "2", [amount.id]: "" }));
    table.rows.push(makeRow(table.columns, { [day.id]: "3", [amount.id]: "" }));
    useStore.getState().load(doc);
  });

  it("fills the source value through every row below in one operation", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    const amount = table.columns[1];
    useStore.getState().fillColumnDown(0, table.id, table.rows[0].id, amount.id);
    expect(useStore.getState().doc.projects[0].months[0].tables[0].rows.map((row) => row.cells[amount.id])).toEqual(["100", "100", "100"]);
  });

  it("fills only compatible columns to the right", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    const source = table.columns[1];
    const target = table.columns[2];
    useStore.getState().fillRowRight(0, table.id, table.rows[0].id, source.id);
    expect(useStore.getState().doc.projects[0].months[0].tables[0].rows[0].cells[target.id]).toBe("100");
  });

  it("fills only the bounded row range and undoes it in one step", () => {
    const before = useStore.getState().doc.projects[0].months[0].tables[0];
    const amount = before.columns[1];
    useStore.getState().fillColumnRange(0, before.id, before.rows[0].id, before.rows[1].id, amount.id);
    let values = useStore.getState().doc.projects[0].months[0].tables[0].rows.map((row) => row.cells[amount.id]);
    expect(values).toEqual(["100", "100", ""]);
    useStore.getState().undo();
    values = useStore.getState().doc.projects[0].months[0].tables[0].rows.map((row) => row.cells[amount.id]);
    expect(values).toEqual(["100", "", ""]);
    useStore.getState().redo();
    values = useStore.getState().doc.projects[0].months[0].tables[0].rows.map((row) => row.cells[amount.id]);
    expect(values).toEqual(["100", "100", ""]);
  });

  it("supports dragging a fill upward", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    const amount = table.columns[1];
    useStore.getState().setCell(0, table.id, table.rows[2].id, amount.id, "75");
    useStore.getState().fillColumnRange(0, table.id, table.rows[2].id, table.rows[1].id, amount.id);
    const values = useStore.getState().doc.projects[0].months[0].tables[0].rows.map((row) => row.cells[amount.id]);
    expect(values).toEqual(["100", "75", "75"]);
  });

  it("keeps a row's fiscal category identity when duplicating it", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    table.rows[0].category = "Gasolina";
    table.rows[0].categoryGroup = "noFiscal";
    useStore.getState().duplicateRow(0, table.id, table.rows[0].id);
    const copy = useStore.getState().doc.projects[0].months[0].tables[0].rows[1];
    expect(copy.category).toBe("Gasolina");
    expect(copy.categoryGroup).toBe("noFiscal");
  });
});

describe("starter examples", () => {
  beforeEach(() => {
    const doc = newAppDoc();
    useStore.getState().load(doc);
    useStore.getState().createProject("Guiado", "income");
  });

  it("runs the tour for every newly-created business", () => {
    expect(useStore.getState().doc.settings.runTour).toBe(true);
    useStore.getState().updateSettings({ runTour: false });
    useStore.getState().createProject("Segundo", "empty");
    expect(useStore.getState().doc.settings.runTour).toBe(true);
  });

  it("clears teaching values but preserves all four table structures", () => {
    const project = useStore.getState().doc.projects[0];
    useStore.getState().clearStarterExamples(project.id);
    const cleared = useStore.getState().doc.projects[0];
    expect(cleared.months[0].tables).toHaveLength(4);
    expect(cleared.onboarding?.sampleDataPresent).toBe(false);
    const income = cleared.months[0].tables[0];
    expect(income.rows[0].cells[income.columns[0].id]).toBe("1");
    expect(income.rows.every((row) => row.cells[income.columns[1].id] === "")).toBe(true);
    expect(cleared.months[0].tables[2].initialBalance).toBe(0);
  });
});

describe("quick-add insertion and sorting", () => {
  beforeEach(() => {
    const { doc } = seedDoc();
    useStore.getState().load(doc);
  });

  it("creates new quick-add rows at the top", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    const [day, amount] = table.columns;
    const newId = useStore.getState().addRowWithValues(0, table.id, {
      [day.id]: "2",
      [amount.id]: "200",
    });
    expect(useStore.getState().doc.projects[0].months[0].tables[0].rows[0].id).toBe(newId);
  });

  it("sorts money columns in either direction", () => {
    const table = useStore.getState().doc.projects[0].months[0].tables[0];
    const [, amount] = table.columns;
    useStore.getState().addRowWithValues(0, table.id, { [amount.id]: "20" });
    useStore.getState().addRowWithValues(0, table.id, { [amount.id]: "300" });

    useStore.getState().sortRows(0, table.id, amount.id, "asc");
    expect(useStore.getState().doc.projects[0].months[0].tables[0].rows.map((r) => r.cells[amount.id])).toEqual(["20", "100", "300"]);

    useStore.getState().sortRows(0, table.id, amount.id, "desc");
    expect(useStore.getState().doc.projects[0].months[0].tables[0].rows.map((r) => r.cells[amount.id])).toEqual(["300", "100", "20"]);
  });

  it("creates a February income table with 28 day rows", () => {
    const id = useStore.getState().addTable(1, "income");
    expect(useStore.getState().doc.projects[0].months[1].tables.find((t) => t.id === id)?.rows).toHaveLength(28);
  });

  it("keeps Quick Add requirements on the business when a table is copied to another month", () => {
    useStore.getState().updateProject("p1", {
      quickAddRequirements: { Ventas: { amount: true, date: true } },
    });
    useStore.getState().copyMonthInto(0, [1], false);

    const project = useStore.getState().doc.projects[0];
    expect(project.months[1].tables[0].title).toBe("Ventas");
    expect(project.quickAddRequirements?.Ventas).toEqual({ amount: true, date: true });
  });
});

describe("copyMonthInto", () => {
  beforeEach(() => {
    const { doc } = seedDoc(); // month 0 has table "t1" with one row of data
    useStore.getState().load(doc);
  });

  it("replaces target months with a layout-only clone (no data) and leaves the source intact", () => {
    useStore.getState().copyMonthInto(0, [1, 2], false);
    const months = useStore.getState().doc.projects[0].months;
    expect(months[1].tables).toHaveLength(1);
    expect(months[2].tables).toHaveLength(1);
    // fresh ids, emptied data
    expect(months[1].tables[0].id).not.toBe("t1");
    expect(months[1].tables[0].rows[0].cells).toEqual({});
    // source untouched (still has its value)
    const src = months[0].tables[0];
    expect(src.rows[0].cells[src.columns[1].id]).toBe("100");
  });

  it("copies data when withData is true and skips the source index", () => {
    useStore.getState().copyMonthInto(0, [0, 3], true);
    const months = useStore.getState().doc.projects[0].months;
    expect(months[0].tables[0].id).toBe("t1"); // source index skipped
    const dst = months[3].tables[0];
    expect(dst.rows[0].cells[dst.columns[1].id]).toBe("100");
  });
});

describe("addTable placement", () => {
  beforeEach(() => {
    const { doc } = seedDoc();
    useStore.getState().load(doc);
  });

  it("shelf-places added tables so none overlap (even at varied sizes)", () => {
    useStore.getState().addTable(0, "income");
    useStore.getState().addTable(0, "ledger");
    const tables = useStore.getState().doc.projects[0].months[0].tables;
    expect(tables).toHaveLength(3); // seed t1 + income + ledger
    const overlaps = (a: Table["layout"], b: Table["layout"]) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        expect(overlaps(tables[i].layout, tables[j].layout)).toBe(false);
      }
    }
  });
});

describe("pasteTable (#6)", () => {
  beforeEach(() => {
    const { doc } = seedDoc();
    useStore.getState().load(doc);
  });

  it("pastes a copied table into another month with data", () => {
    const src = useStore.getState().doc.projects[0].months[0].tables[0];
    const newId = useStore.getState().pasteTable(1, src, true);
    const dst = useStore.getState().doc.projects[0].months[1];
    expect(dst.tables).toHaveLength(1);
    const pasted = dst.tables[0];
    expect(pasted.id).toBe(newId);
    expect(pasted.id).not.toBe(src.id);
    expect(pasted.title).toBe("Ventas"); // no "(copia)" suffix on paste
    const [cDia, cMonto] = pasted.columns;
    expect(pasted.rows[0].cells[cDia.id]).toBe("1");
    expect(pasted.rows[0].cells[cMonto.id]).toBe("100");
    expect(pasted.rows[0].notes?.[cMonto.id]).toBe("una nota");
  });

  it("pastes structure only (empty cells)", () => {
    const src = useStore.getState().doc.projects[0].months[0].tables[0];
    useStore.getState().pasteTable(2, src, false);
    const pasted = useStore.getState().doc.projects[0].months[2].tables[0];
    expect(pasted.columns).toHaveLength(src.columns.length);
    expect(pasted.rows).toHaveLength(src.rows.length);
    expect(pasted.rows[0].cells).toEqual({});
  });
});
