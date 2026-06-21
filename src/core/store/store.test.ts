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

describe("reorderProjects", () => {
  function multiDoc(): AppDoc {
    const mk = (id: string, name: string) => {
      const p = newProject(name);
      p.id = id;
      return p;
    };
    return { ...newAppDoc(), projects: [mk("a", "A"), mk("b", "B"), mk("c", "C")], currentProjectId: "a" };
  }
  beforeEach(() => useStore.getState().load(multiDoc()));

  it("moves a business before the target and persists the new order", () => {
    useStore.getState().reorderProjects("c", "a"); // drop C onto A
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("handles a downward move (recomputes the target index)", () => {
    useStore.getState().reorderProjects("a", "c"); // drop A onto C
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("is undoable", () => {
    useStore.getState().reorderProjects("a", "c");
    useStore.getState().undo();
    expect(useStore.getState().doc.projects.map((p) => p.id)).toEqual(["a", "b", "c"]);
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
