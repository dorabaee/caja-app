import { afterEach, describe, expect, it } from "vitest";
import { importLegacy } from "@core/migration/importLegacy";
import { monthlyTotals } from "@core/compute";

/* eslint-disable @typescript-eslint/no-explicit-any */

function stubLocalStorage(map: Record<string, string>): void {
  const store = new Map(Object.entries(map));
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

afterEach(() => {
  delete (globalThis as any).localStorage;
});

const legacy = {
  state: {
    projects: [
      {
        id: "p1",
        name: "Tienda de Doña Rosa",
        createdAt: 1781722977110,
        initialBalance: 8000,
        months: Array.from({ length: 12 }, (_, i) =>
          i === 5
            ? {
                tables: [
                  {
                    id: "t1",
                    title: "Ingresos diarios",
                    kind: "income",
                    columns: [
                      { id: "c1", name: "Día", type: "text" },
                      { id: "c2", name: "Efectivo recibido", type: "money" },
                    ],
                    rows: [{ id: "r1", cells: { c1: "1", c2: "7020" }, notes: {}, links: {} }],
                  },
                  {
                    id: "t2",
                    title: "Gastos",
                    kind: "expense",
                    columns: [
                      { id: "d1", name: "Descripción", type: "text" },
                      { id: "d2", name: "Monto", type: "money" },
                    ],
                    rows: [{ id: "r2", cells: { d1: "Renta", d2: "4700" }, notes: {}, links: {} }],
                  },
                  {
                    id: "t3",
                    title: "Libro de cuenta bancaria",
                    kind: "income",
                    columns: [
                      { id: "e1", name: "Fecha", type: "date" },
                      { id: "e2", name: "Depósito", type: "money" },
                      { id: "e3", name: "Importe del gasto", type: "money" },
                    ],
                    rows: [],
                    initialBalance: 8000,
                  },
                ],
                charts: [],
              }
            : { tables: [], charts: [] },
        ),
      },
    ],
  },
  version: 0,
};

describe("importLegacy", () => {
  it("maps legacy caja:v1 into an AppDoc", () => {
    stubLocalStorage({
      "caja:v1": JSON.stringify(legacy),
      "caja:theme": "dark",
      "caja:accent": "ocean",
    });
    const doc = importLegacy();
    expect(doc).not.toBeNull();
    const p = doc!.projects[0];
    expect(p.name).toBe("Tienda de Doña Rosa");
    expect(p.months).toHaveLength(12);

    const june = p.months[5];
    expect(june.tables).toHaveLength(3);

    const ledger = june.tables.find((t) => t.title.includes("Libro"))!;
    expect(ledger.kind).toBe("ledger");
    expect(ledger.columns.find((c) => c.name === "Depósito")!.role).toBe("deposit");
    expect(ledger.columns.find((c) => c.name === "Importe del gasto")!.role).toBe("withdrawal");

    const totals = monthlyTotals(june);
    expect(totals).toEqual({ entro: 7020, salio: 4700, teQueda: 2320 });

    expect(doc!.settings.theme).toBe("dark");
    expect(doc!.settings.accent).toBe("ocean");
    expect(doc!.migratedFromLegacy).toBe(true);
  });

  it("returns null when there is no legacy data", () => {
    stubLocalStorage({});
    expect(importLegacy()).toBeNull();
  });
});
