import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { defaultSettings, newProject } from "@core/model/defaults";
import { buildStatement } from "@core/export/statement";
import { STATEMENT_FORMATS } from "@core/export/statementFormats";
import { StatementDocument } from "./StatementDocument";

describe("statement PDF pagination", () => {
  const statement = buildStatement(newProject("Servicios y mantenimiento del centro · negocio de ejemplo"));
  it.each([true, false])("keeps all six formats in one six-page file (charts: %s)", async (charts) => {
    const buffer = await renderToBuffer(StatementDocument({ statement, settings: defaultSettings(), generatedAt: "12/9/2026", options: {formats: [...STATEMENT_FORMATS], charts, throughMonth: 11} }));
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(6);
  });
  it("exports only selected formats, with a partial-year cutoff and English copy", async () => {
    const buffer = await renderToBuffer(StatementDocument({statement, settings: {...defaultSettings(),locale:"en"},generatedAt:"9/12/2026",options:{formats:["quarterly","cumulative"],charts:true,throughMonth:5}}));
    expect(buffer.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
  });
});
