import { describe, expect, it } from "vitest";
import { migrateDoc } from "@core/migration/migrateDoc";
import { newAppDoc, newProject } from "@core/model/defaults";
import { CURRENT_SCHEMA_VERSION, type AppDoc } from "@core/model/types";

function docWithChart(chart: Record<string, unknown>): AppDoc {
  const project = newProject("P");
  project.months[0].charts = [chart as never];
  return { ...newAppDoc(), projects: [project] };
}

describe("migrateDoc — chart linkedTableId → linkedTableIds (#9)", () => {
  it("wraps a legacy single linkedTableId into an array", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableId: "t1" }));
    const chart = doc.projects[0].months[0].charts[0];
    expect(chart.linkedTableIds).toEqual(["t1"]);
    expect("linkedTableId" in chart).toBe(false);
  });

  it("turns a null/absent link into an empty array", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableId: null }));
    expect(doc.projects[0].months[0].charts[0].linkedTableIds).toEqual([]);
  });

  it("leaves an already-migrated chart untouched", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableIds: ["t1", "t2"] }));
    expect(doc.projects[0].months[0].charts[0].linkedTableIds).toEqual(["t1", "t2"]);
  });
});

describe("migrateDoc — v1 → v2 (fiscal tables + grouped categories)", () => {
  function legacyDoc(): AppDoc {
    const project = newProject("P");
    project.categories = ["Mi categoría"] as never;
    project.months[0].tables = [
      {
        id: "t1",
        title: "Libro de cuenta bancaria",
        kind: "ledger",
        columns: [
          { id: "c1", name: "Fecha", type: "date" },
          { id: "c2", name: "Descripción", type: "text" },
        ],
        rows: [],
        layout: { x: 0, y: 0, w: 400, h: 300 },
      },
      {
        id: "t2",
        title: "Gastos",
        kind: "expense",
        columns: [{ id: "c3", name: "Monto", type: "money" }],
        rows: [],
        layout: { x: 0, y: 0, w: 400, h: 300 },
      },
    ];
    return { ...newAppDoc(), schemaVersion: 1, projects: [project] };
  }

  it("renames the old default titles once and marks the ledger fiscal", () => {
    const doc = migrateDoc(legacyDoc());
    const [ledger, expense] = doc.projects[0].months[0].tables;
    expect(ledger.title).toBe("Banco Fiscal");
    expect(ledger.fiscal).toBe(true);
    expect(expense.title).toBe("Contabilidad Personal");
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("leaves a user's own title alone on a later boot", () => {
    const doc = migrateDoc(legacyDoc());
    doc.projects[0].months[0].tables[0].title = "Banco de la tienda";
    const again = migrateDoc(doc);
    expect(again.projects[0].months[0].tables[0].title).toBe("Banco de la tienda");
  });

  it("converts string categories and tops up the defaults without duplicating them", () => {
    const doc = migrateDoc(legacyDoc());
    const categories = doc.projects[0].categories ?? [];
    expect(categories[0]).toEqual({ name: "Mi categoría" });
    expect(categories).toContainEqual({ name: "Gasolina", group: "fiscal" });
    expect(categories).toContainEqual({ name: "Nóminas", group: "noFiscal" });
    const names = categories.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);

    const again = migrateDoc(doc);
    expect(again.projects[0].categories).toHaveLength(categories.length);
  });

  it("backfills a category column on ledgers so row tags can render", () => {
    const doc = migrateDoc(legacyDoc());
    const ledger = doc.projects[0].months[0].tables[0];
    expect(ledger.columns.find((c) => c.withCategory)?.name).toBe("Descripción");
  });
});

describe("migrateDoc — v2 → v3 (the category moves off the description cell)", () => {
  function v2Doc(): AppDoc {
    const project = newProject("P");
    project.categories = [
      { name: "Gasolina", group: "fiscal" },
      { name: "Servicios", group: "fiscal" },
    ];
    project.months[0].tables = [
      {
        id: "t1",
        title: "Salida de Dinero",
        kind: "expense",
        columns: [
          { id: "c1", name: "Descripción", type: "text", category: true },
          { id: "c2", name: "Monto", type: "money" },
        ],
        rows: [
          { id: "r1", cells: { c1: "gasolina", c2: "100" } },
          { id: "r2", cells: { c1: "Cubeta y Trapeador", c2: "870" } },
        ],
        layout: { x: 0, y: 0, w: 400, h: 300 },
      },
    ];
    return { ...newAppDoc(), schemaVersion: 2, projects: [project] };
  }

  it("gives a row the category its text named, keeping the text itself", () => {
    const table = migrateDoc(v2Doc()).projects[0].months[0].tables[0];
    const [gas, cubeta] = table.rows;
    // Canonicalised to the project's spelling, and the description survives verbatim.
    expect(gas.category).toBe("Gasolina");
    expect(gas.cells.c1).toBe("gasolina");
    // A free-typed description names no category, so the row simply has none yet.
    expect(cubeta.category).toBeUndefined();
    expect(cubeta.cells.c1).toBe("Cubeta y Trapeador");
  });

  it("re-flags the column as carrying both faces and drops the old marker", () => {
    const col = migrateDoc(v2Doc()).projects[0].months[0].tables[0].columns[0];
    expect(col.withCategory).toBe(true);
    expect("category" in col).toBe(false);
  });

  it("leaves an already-migrated doc alone on the next boot", () => {
    const once = migrateDoc(v2Doc());
    once.projects[0].months[0].tables[0].rows[0].category = "Servicios"; // user re-files it
    const twice = migrateDoc(once);
    expect(twice.projects[0].months[0].tables[0].rows[0].category).toBe("Servicios");
    expect(twice.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("does not invent a category for a cleared row", () => {
    const once = migrateDoc(v2Doc());
    delete once.projects[0].months[0].tables[0].rows[0].category; // user cleared the tag
    const twice = migrateDoc(once);
    expect(twice.projects[0].months[0].tables[0].rows[0].category).toBeUndefined();
  });
});
