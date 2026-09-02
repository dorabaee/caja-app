import { describe, expect, it } from "vitest";
import { categoryBreakdownForTable, columnTotals } from "@core/compute";
import { migrateDoc } from "@core/migration/migrateDoc";
import { CURRENT_SCHEMA_VERSION } from "@core/model/types";
import { DEMO_SEED, buildSeedProject } from "./seedData";

describe("dev seed", () => {
  const project = buildSeedProject(DEMO_SEED);
  const june = project.months[5];

  it("fills a month with tables that already carry data", () => {
    expect(june.tables.map((t) => t.title)).toEqual([
      "Entrada de Dinero",
      "Salida de Dinero",
      "Banco Fiscal",
    ]);
    for (const table of june.tables) expect(table.rows.length).toBeGreaterThan(0);
  });

  it("keeps the description and the category apart", () => {
    const ledger = june.tables[2];
    const [camioneta, personal] = ledger.rows;
    const desc = ledger.columns.find((c) => c.withCategory)!;
    // Two descriptions, one category — the case the split exists for.
    expect(camioneta.cells[desc.id]).toBe("Gasolina de la camioneta");
    expect(personal.cells[desc.id]).toBe("Gasolina personal");
    expect(camioneta.category).toBe("Gasolina");
    expect(personal.category).toBe("Gasolina");

    // The breakdown reads the table's first money column — deposits, in a ledger.
    const slices = categoryBreakdownForTable(ledger, ["Gasolina", "Servicios"]);
    expect(slices.find((s) => s.label === "Gasolina")?.value).toBe(18400 + 21300);
  });

  it("totals each money column of the expense table", () => {
    const salida = june.tables[1];
    const totals = columnTotals(salida);
    const bancos = salida.columns.find((c) => c.name === "BANCOS")!;
    expect(totals[bancos.id]).toBe(3300 + 3025 + 3760 + 13595 + 7070);
  });

  it("is already at the current schema — migration leaves it alone", () => {
    const doc = migrateDoc({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      projects: [project],
      currentProjectId: project.id,
      settings: {} as never,
    });
    const ledger = doc.projects[0].months[5].tables[2];
    expect(ledger.rows[0].category).toBe("Gasolina");
  });
});
