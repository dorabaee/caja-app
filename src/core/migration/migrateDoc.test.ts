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
    expect(ledger.columns.find((c) => c.category)?.name).toBe("Descripción");
  });
});
