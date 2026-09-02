import { describe, expect, it } from "vitest";
import { BANKS, bankInitials, bankMeta } from "@core/model/banks";

describe("bankMeta", () => {
  it("resolves every built-in bank, each with a logo file", () => {
    for (const b of BANKS) {
      const meta = bankMeta(b.key);
      expect(meta?.label).toBe(b.label);
      expect(meta?.logo).toMatch(/\.svg$/);
    }
  });

  it("resolves a bank the user added, with no logo", () => {
    const meta = bankMeta("own-1", [{ id: "own-1", name: "Caja Popular" }]);
    expect(meta?.label).toBe("Caja Popular");
    expect(meta?.logo).toBeNull();
    expect(meta?.short).toBe("CP");
  });

  it("returns null for an unknown key or none at all", () => {
    expect(bankMeta(undefined)).toBeNull();
    expect(bankMeta("nope")).toBeNull();
    expect(bankMeta("nope", [{ id: "own-1", name: "Caja Popular" }])).toBeNull();
  });

  it("prefers the built-in when a custom bank reuses its id", () => {
    const meta = bankMeta("bbva", [{ id: "bbva", name: "Impostor" }]);
    expect(meta?.label).toBe("BBVA");
  });
});

describe("bankInitials", () => {
  it("takes the first letter of each word, up to three", () => {
    expect(bankInitials("Caja Popular Mexicana")).toBe("CPM");
    expect(bankInitials("Banco del Bajío Norte")).toBe("BDB");
  });

  it("uses the first two letters of a single word", () => {
    expect(bankInitials("Nubank")).toBe("NU");
  });

  it("survives blank or padded input", () => {
    expect(bankInitials("   ")).toBe("?");
    expect(bankInitials("  Klar  ")).toBe("KL");
  });
});
