import { describe, expect, it } from "vitest";
import { makeIncomeTable, newProject, newTemplateProject } from "@core/model/defaults";
import { buildTourSteps, scrollPositionToReveal, tableHasMeaningfulData } from "./Tour";

describe("contextual tour", () => {
  it("uses empty-board setup steps for a blank business", () => {
    const keys = buildTourSteps(newProject("Vacío"), 0).map((step) => step.titleKey);
    expect(keys).toContain("tour.emptyTitle");
    expect(keys).toContain("tour.addTableTitle");
    expect(keys).not.toContain("tour.incomeTitle");
  });

  it("explains all four tables in a guided sample without empty-entry steps", () => {
    const keys = buildTourSteps(newTemplateProject("Guiado"), 0).map((step) => step.titleKey);
    for (const kind of ["income", "expense", "ledger", "blank"]) {
      expect(keys).toContain(`tour.${kind}Title`);
      expect(keys).not.toContain(`tour.${kind}EmptyTitle`);
    }
  });

  it("does not treat the income day numbers as real activity", () => {
    const income = makeIncomeTable();
    expect(tableHasMeaningfulData(income)).toBe(false);
    income.rows[0].cells[income.columns[1].id] = "20";
    expect(tableHasMeaningfulData(income)).toBe(true);
  });

  it("centers a partially clipped table inside the canvas viewport", () => {
    const viewport = { left: 0, top: 100, right: 1000, bottom: 700, width: 1000, height: 600 };
    const table = { left: 100, top: 600, right: 700, bottom: 1000, width: 600, height: 400 };
    expect(scrollPositionToReveal(viewport, table, { left: 0, top: 0 })).toEqual({
      left: 0,
      top: 400,
    });
  });

  it("does not move a table that is already fully visible", () => {
    const viewport = { left: 0, top: 100, right: 1000, bottom: 700, width: 1000, height: 600 };
    const table = { left: 100, top: 180, right: 700, bottom: 580, width: 600, height: 400 };
    expect(scrollPositionToReveal(viewport, table, { left: 30, top: 40 })).toBeNull();
  });

  it("keeps an oversized table's header aligned with the visible canvas", () => {
    const viewport = { left: 0, top: 100, right: 1000, bottom: 700, width: 1000, height: 600 };
    const table = { left: 120, top: 900, right: 1120, bottom: 1700, width: 1000, height: 800 };
    expect(scrollPositionToReveal(viewport, table, { left: 50, top: 200 })).toEqual({
      left: 150,
      top: 980,
    });
  });
});
