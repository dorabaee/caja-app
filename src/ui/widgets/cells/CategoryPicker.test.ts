import { describe, expect, it } from "vitest";
import { categoryIsSelected } from "./CategoryPicker";

describe("CategoryPicker selection", () => {
  it("uses the row's saved group when it differs from the table preference", () => {
    const category = { name: "Material e insumos", group: "fiscal" as const };
    expect(categoryIsSelected(category, category.name, "fiscal", "noFiscal")).toBe(true);
  });

  it("does not select an equal name from the other group", () => {
    const fiscal = { name: "Mantenimiento", group: "fiscal" as const };
    const noFiscal = { name: "Mantenimiento", group: "noFiscal" as const };
    expect(categoryIsSelected(fiscal, "Mantenimiento", "fiscal", "noFiscal")).toBe(true);
    expect(categoryIsSelected(noFiscal, "Mantenimiento", "fiscal", "noFiscal")).toBe(false);
  });

  it("falls back to the table preference for legacy rows without a saved group", () => {
    const category = { name: "Nóminas", group: "noFiscal" as const };
    expect(categoryIsSelected(category, category.name, undefined, "noFiscal")).toBe(true);
  });
});
