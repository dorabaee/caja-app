import { describe, expect, it } from "vitest";
import { uniqueTableLabels } from "@core/compute";
import { makeBlankTable, makeExpenseTable } from "@core/model/defaults";
import type { Table } from "@core/model/types";

function titled(title: string): Table {
  const t = makeBlankTable();
  t.title = title;
  return t;
}

describe("uniqueTableLabels", () => {
  it("leaves distinct titles alone", () => {
    const a = titled("Ingresos diarios");
    const b = titled("Banco Fiscal");
    const labels = uniqueTableLabels([a, b]);
    expect(labels[a.id]).toBe("Ingresos diarios");
    expect(labels[b.id]).toBe("Banco Fiscal");
  });

  it("numbers repeats from the second one on, in order", () => {
    const one = titled("Gastos");
    const two = titled("Gastos");
    const three = titled("Gastos");
    const labels = uniqueTableLabels([one, two, three]);
    expect([labels[one.id], labels[two.id], labels[three.id]]).toEqual([
      "Gastos",
      "Gastos (1)",
      "Gastos (2)",
    ]);
  });

  it("counts each title separately", () => {
    const g1 = titled("Gastos");
    const v1 = titled("Ventas");
    const g2 = titled("Gastos");
    const labels = uniqueTableLabels([g1, v1, g2]);
    expect(labels[v1.id]).toBe("Ventas");
    expect(labels[g2.id]).toBe("Gastos (1)");
  });

  it("covers every table it is given, ledgers included", () => {
    const tables = [makeExpenseTable(), makeExpenseTable()];
    const labels = uniqueTableLabels(tables);
    expect(Object.keys(labels)).toHaveLength(2);
    expect(labels[tables[1].id]).toBe("Contabilidad Personal (1)");
  });
});
