import { describe, expect, it } from "vitest";
import { newProject } from "../model/defaults";
import { buildStatement } from "./statement";
import { cumulativeStatement, quarterlyStatement, shareOfIncome, normalizeStatementOptions } from "./statementFormats";

describe("statement reporting views", () => {
  const s = buildStatement(newProject("Test"));
  s.months = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, entro: (monthIndex + 1) * 100, salio: 250, saldo: (monthIndex + 1) * 100 - 250 }));
  it("groups each month into exactly one quarter and preserves losses", () => {
    const quarters = quarterlyStatement(s);
    expect(quarters[0]).toEqual({ monthIndex: 0, entro: 600, salio: 750, saldo: -150 });
    expect(quarters.reduce((sum, q) => sum + q.entro, 0)).toBe(7800);
    expect(quarters.reduce((sum, q) => sum + q.saldo, 0)).toBe(4800);
  });
  it("stops at the selected month without double-counting prior cumulative values", () => {
    const rows = cumulativeStatement(s, 2);
    expect(rows).toHaveLength(3);
    expect(rows.map((m) => m.saldo)).toEqual([-150, -200, -150]);
    expect(cumulativeStatement(s, 11)[11].saldo).toBe(4800);
  });
  it("does not invent zero-income percentages, or clamp loss percentages", () => {
    expect(shareOfIncome(250, 0)).toBeNull();
    expect(shareOfIncome(250, 100)).toBe(2.5);
    expect(shareOfIncome(-150, 100)).toBe(-1.5);
  });
  it("orders selected formats, removes duplicates, and rejects an empty document", () => {
    expect(normalizeStatementOptions({formats: ["quarterly", "simple", "simple"],charts:true,throughMonth:0}).formats).toEqual(["simple", "quarterly"]);
    expect(() => normalizeStatementOptions({formats: [],charts:false,throughMonth:0})).toThrow();
    expect(() => normalizeStatementOptions({formats: ["simple"],charts:false,throughMonth:12})).toThrow();
  });
});
