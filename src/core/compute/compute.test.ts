import { describe, expect, it } from "vitest";
import { makeColumn, makeRow, twelveMonths } from "@core/model/defaults";
import type { Project, Table, WidgetLayout } from "@core/model/types";
import {
  allBusinessesMetrics,
  cumulativeBalances,
  dashboardMetrics,
  ledgerBalance,
  monthlyTotals,
  projectHasActivity,
  tableTotal,
  yearlyResumen,
} from "@core/compute";
import { parseMoney } from "@core/format/money";

const L: WidgetLayout = { x: 0, y: 0, w: 1, h: 1 };

function incomeTable(values: number[]): Table {
  const day = makeColumn("Día", "text");
  const cash = makeColumn("Efectivo recibido", "money");
  const rows = values.map((v, i) =>
    makeRow([day, cash], { [day.id]: String(i + 1), [cash.id]: String(v) }),
  );
  return { id: "inc", title: "Ingresos diarios", kind: "income", columns: [day, cash], rows, layout: L };
}

function expenseTable(values: number[]): Table {
  const desc = makeColumn("Descripción", "text", { withCategory: true });
  const monto = makeColumn("Monto", "money");
  const rows = values.map((v) => makeRow([desc, monto], { [monto.id]: String(v) }));
  return { id: "exp", title: "Gastos", kind: "expense", columns: [desc, monto], rows, layout: L };
}

function ledgerTable(initial: number, deposits: number[], withdrawals: number[]): Table {
  const fecha = makeColumn("Fecha", "date");
  const dep = makeColumn("Depósito", "money", { role: "deposit" });
  const wit = makeColumn("Importe del gasto", "money", { role: "withdrawal" });
  const n = Math.max(deposits.length, withdrawals.length);
  const rows = Array.from({ length: n }, (_, i) =>
    makeRow([fecha, dep, wit], {
      [dep.id]: deposits[i] != null ? String(deposits[i]) : "",
      [wit.id]: withdrawals[i] != null ? String(withdrawals[i]) : "",
    }),
  );
  return {
    id: "led",
    title: "Libro de cuenta bancaria",
    kind: "ledger",
    columns: [fecha, dep, wit],
    rows,
    initialBalance: initial,
    layout: L,
  };
}

describe("parseMoney", () => {
  it("parses currency strings", () => {
    expect(parseMoney("$1,200.50")).toBe(1200.5);
    expect(parseMoney("1.200,50")).toBe(1200.5);
    expect(parseMoney("300")).toBe(300);
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("  $ 4,700.00 ")).toBe(4700);
  });
});

describe("table + monthly totals", () => {
  it("sums money columns", () => {
    expect(tableTotal(incomeTable([3000, 2520, 1500]))).toBe(7020);
    expect(tableTotal(expenseTable([200, 1500, 3000]))).toBe(4700);
  });

  it("computes Entró / Salió / Te queda, excluding the ledger", () => {
    const month = {
      tables: [
        incomeTable([3000, 2520, 1500]),
        expenseTable([200, 1500, 3000]),
        ledgerTable(8000, [750], [4700]),
      ],
      charts: [],
    };
    const { entro, salio, teQueda } = monthlyTotals(month);
    expect(entro).toBe(7020);
    expect(salio).toBe(4700);
    expect(teQueda).toBe(2320);
  });
});

describe("ledger", () => {
  it("computes final balance = initial + deposits − withdrawals", () => {
    const r = ledgerBalance(ledgerTable(8000, [750], [4700]));
    expect(r.deposits).toBe(750);
    expect(r.withdrawals).toBe(4700);
    expect(r.finalBalance).toBe(4050);
  });
});

describe("yearly resumen + carry-over", () => {
  it("aggregates the year and chains cumulative balances", () => {
    const project: Project = {
      id: "p",
      name: "Tienda de Doña Rosa",
      createdAt: 0,
      initialBalance: 1000,
      carryOver: true,
      months: twelveMonths(),
    };
    project.months[5] = {
      tables: [incomeTable([7020]), expenseTable([4700])],
      charts: [],
    };
    const { totals } = yearlyResumen(project);
    expect(totals.entro).toBe(7020);
    expect(totals.salio).toBe(4700);
    expect(totals.teQueda).toBe(2320);

    const cum = cumulativeBalances(project);
    expect(cum[4]).toBe(1000); // before June: just the initial balance
    expect(cum[5]).toBe(3320); // 1000 + 2320
    expect(cum[11]).toBe(3320);
  });
});

function projectWith(id: string, name: string, income: number[], expense: number[]): Project {
  const project: Project = { id, name, createdAt: 0, months: twelveMonths() };
  project.months[5] = { tables: [incomeTable(income), expenseTable(expense)], charts: [] };
  return project;
}

describe("dashboardMetrics", () => {
  it("derives trend, balance, margin and best/worst month", () => {
    const project = projectWith("p", "Tienda", [7020], [4700]);
    const m = dashboardMetrics(project);
    expect(m.totals).toEqual({ entro: 7020, salio: 4700, teQueda: 2320 });
    expect(m.trend[5]).toEqual({ monthIndex: 5, entro: 7020, salio: 4700 });
    expect(m.balanceOverTime[5].balance).toBe(2320);
    expect(m.balanceOverTime[11].balance).toBe(2320);
    expect(m.profitMargin).toBeCloseTo(2320 / 7020, 6);
    expect(m.bestMonth).toBe(5);
    expect(m.worstMonth).toBe(5);
  });

  it("reports no best/worst month for an empty project", () => {
    const empty: Project = { id: "e", name: "Vacío", createdAt: 0, months: twelveMonths() };
    const m = dashboardMetrics(empty);
    expect(m.bestMonth).toBeNull();
    expect(m.worstMonth).toBeNull();
    expect(m.profitMargin).toBe(0);
    expect(projectHasActivity(empty)).toBe(false);
    expect(projectHasActivity(projectWith("p", "x", [10], []))).toBe(true);
  });
});

describe("allBusinessesMetrics", () => {
  it("sums across every business and ranks best/worst", () => {
    const a = projectWith("a", "Tienda", [7020], [4700]); // teQueda 2320
    const b = projectWith("b", "Taller", [3000], [1000]); // teQueda 2000
    const m = allBusinessesMetrics([a, b]);

    expect(m.totals).toEqual({ entro: 10020, salio: 5700, teQueda: 4320 });
    expect(m.trend[5]).toEqual({ monthIndex: 5, entro: 10020, salio: 5700 });
    expect(m.balanceOverTime[11].balance).toBe(4320);
    expect(m.profitMargin).toBeCloseTo(4320 / 10020, 6);
    expect(m.businesses.map((x) => x.id)).toEqual(["a", "b"]);
    expect(m.bestBusiness).toBe("a");
    expect(m.worstBusiness).toBe("b");
  });

  it("handles an empty roster", () => {
    const m = allBusinessesMetrics([]);
    expect(m.totals).toEqual({ entro: 0, salio: 0, teQueda: 0 });
    expect(m.bestBusiness).toBeNull();
    expect(m.businesses).toHaveLength(0);
  });
});
