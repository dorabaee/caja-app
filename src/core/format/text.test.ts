import { describe, expect, it } from "vitest";
import { normalizeTextCell } from "./text";

describe("normalizeTextCell", () => {
  it("uppercases Spanish text and preserves accents", () => {
    expect(normalizeTextCell("José camión", true, "es")).toBe("JOSÉ CAMIÓN");
  });

  it("preserves casing when disabled", () => {
    expect(normalizeTextCell("Gasolina Mixta", false, "es")).toBe("Gasolina Mixta");
  });
});
