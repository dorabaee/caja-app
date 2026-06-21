import { describe, expect, it } from "vitest";
import { makeColumn, makeRow } from "@core/model/defaults";
import { nextRowValues } from "@core/compute/rows";
import { nextDateCell } from "@core/format/date";

describe("nextDateCell", () => {
  it("advances an ISO date by one day", () => {
    expect(nextDateCell("2026-01-31")).toBe("2026-02-01");
    expect(nextDateCell("2026-02-28")).toBe("2026-03-01"); // 2026 not a leap year
  });
  it("returns null for unparseable values", () => {
    expect(nextDateCell("")).toBeNull();
    expect(nextDateCell("not a date")).toBeNull();
    expect(nextDateCell(undefined)).toBeNull();
  });
});

describe("nextRowValues", () => {
  it("increments a plain-integer text column (the Día counter)", () => {
    const dia = makeColumn("Día", "text");
    const cash = makeColumn("Efectivo recibido", "money");
    const cols = [dia, cash];
    const rows = [makeRow(cols, { [dia.id]: "28" })];
    const next = nextRowValues(cols, rows);
    expect(next[dia.id]).toBe("29");
    expect(next[cash.id]).toBeUndefined(); // money never carried forward
  });

  it("advances a date column by a day", () => {
    const fecha = makeColumn("Fecha", "date");
    const monto = makeColumn("Monto", "money");
    const cols = [fecha, monto];
    const rows = [makeRow(cols, { [fecha.id]: "2026-06-30", [monto.id]: "100" })];
    const next = nextRowValues(cols, rows);
    expect(next[fecha.id]).toBe("2026-07-01");
    expect(next[monto.id]).toBeUndefined();
  });

  it("does not increment non-integer text (descriptions)", () => {
    const desc = makeColumn("Descripción", "text");
    const cols = [desc];
    const rows = [makeRow(cols, { [desc.id]: "Renta" })];
    expect(nextRowValues(cols, rows)).toEqual({});
  });

  it("returns empty when there is no prior row", () => {
    const dia = makeColumn("Día", "text");
    expect(nextRowValues([dia], [])).toEqual({});
  });

  it("skips columns whose last value is blank", () => {
    const dia = makeColumn("Día", "text");
    const cols = [dia];
    const rows = [makeRow(cols, { [dia.id]: "" })];
    expect(nextRowValues(cols, rows)).toEqual({});
  });
});
