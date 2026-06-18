import { parseMoney } from "../format/money";
import type { Project, Table } from "../model/types";
import { materializeMonth, materializedMonths, monthlyTotals, yearlyResumen } from "./monthly";

export interface CategorySlice {
  label: string;
  value: number;
}

/** Group a single table's money total by its category column value. */
export function categoryBreakdownForTable(table: Table): CategorySlice[] {
  const catCol = table.columns.find((c) => c.category) ?? table.columns.find((c) => c.type === "text");
  const moneyCol = table.columns.find((c) => c.type === "money");
  if (!catCol || !moneyCol) return [];
  const map = new Map<string, number>();
  for (const row of table.rows) {
    const amount = parseMoney(row.cells[moneyCol.id]);
    if (amount === 0) continue;
    const label = (row.cells[catCol.id] || "").trim() || "Sin categoría";
    map.set(label, (map.get(label) ?? 0) + amount);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Expense categories across the project (or a single month). */
export function expenseCategories(project: Project, monthIndex?: number): CategorySlice[] {
  const months =
    monthIndex == null ? materializedMonths(project) : [materializeMonth(project, monthIndex)];
  const map = new Map<string, number>();
  for (const m of months) {
    for (const t of m.tables) {
      if (t.kind !== "expense") continue;
      for (const slice of categoryBreakdownForTable(t)) {
        map.set(slice.label, (map.get(slice.label) ?? 0) + slice.value);
      }
    }
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export interface DashboardMetrics {
  trend: { monthIndex: number; entro: number; salio: number }[];
  balanceOverTime: { monthIndex: number; balance: number }[];
  topCategories: CategorySlice[];
  profitMargin: number; // 0..1
  bestMonth: number | null;
  worstMonth: number | null;
  totals: { entro: number; salio: number; teQueda: number };
}

/** Whether a project has any recorded movement in the year (so empty businesses can be hidden). */
export function projectHasActivity(project: Project): boolean {
  const { totals } = yearlyResumen(project);
  return totals.entro !== 0 || totals.salio !== 0;
}

export interface BusinessSummary {
  id: string;
  name: string;
  totals: { entro: number; salio: number; teQueda: number };
  profitMargin: number;
}

export interface AllBusinessesMetrics {
  businesses: BusinessSummary[];
  totals: { entro: number; salio: number; teQueda: number };
  /** Entró / Salió summed across every business, by month. */
  trend: { monthIndex: number; entro: number; salio: number }[];
  /** Combined running balance across the year (Σ each business's net per month). */
  balanceOverTime: { monthIndex: number; balance: number }[];
  topCategories: CategorySlice[];
  profitMargin: number;
  bestBusiness: string | null;
  worstBusiness: string | null;
}

/**
 * Aggregate the year across every business (assumes a single app-wide currency).
 * Sums each project's monthly Entró/Salió and expense categories.
 */
export function allBusinessesMetrics(projects: Project[]): AllBusinessesMetrics {
  const trend = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, entro: 0, salio: 0 }));
  const catMap = new Map<string, number>();
  let initialBalance = 0;

  const businesses: BusinessSummary[] = projects.map((p) => {
    const { months, totals } = yearlyResumen(p);
    for (const m of months) {
      trend[m.monthIndex].entro += m.entro;
      trend[m.monthIndex].salio += m.salio;
    }
    initialBalance += p.initialBalance ?? 0;
    for (const slice of expenseCategories(p)) {
      catMap.set(slice.label, (catMap.get(slice.label) ?? 0) + slice.value);
    }
    return {
      id: p.id,
      name: p.name,
      totals,
      profitMargin: totals.entro > 0 ? totals.teQueda / totals.entro : 0,
    };
  });

  const totals = trend.reduce(
    (acc, m) => ({
      entro: acc.entro + m.entro,
      salio: acc.salio + m.salio,
      teQueda: acc.teQueda + (m.entro - m.salio),
    }),
    { entro: 0, salio: 0, teQueda: 0 },
  );

  let running = initialBalance;
  const balanceOverTime = trend.map((m) => {
    running += m.entro - m.salio;
    return { monthIndex: m.monthIndex, balance: running };
  });

  const active = businesses.filter((b) => b.totals.entro !== 0 || b.totals.salio !== 0);
  let bestBusiness: string | null = null;
  let worstBusiness: string | null = null;
  if (active.length) {
    bestBusiness = active.reduce((a, b) => (b.totals.teQueda > a.totals.teQueda ? b : a)).id;
    worstBusiness = active.reduce((a, b) => (b.totals.teQueda < a.totals.teQueda ? b : a)).id;
  }

  const topCategories = [...catMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    businesses,
    totals,
    trend,
    balanceOverTime,
    topCategories,
    profitMargin: totals.entro > 0 ? totals.teQueda / totals.entro : 0,
    bestBusiness,
    worstBusiness,
  };
}

export function dashboardMetrics(project: Project): DashboardMetrics {
  const { months, totals } = yearlyResumen(project);
  const trend = months.map((m) => ({ monthIndex: m.monthIndex, entro: m.entro, salio: m.salio }));

  let running = project.initialBalance ?? 0;
  const balanceOverTime = materializedMonths(project).map((m, i) => {
    running += monthlyTotals(m).teQueda;
    return { monthIndex: i, balance: running };
  });

  const active = months.filter((m) => m.entro !== 0 || m.salio !== 0);
  let bestMonth: number | null = null;
  let worstMonth: number | null = null;
  if (active.length) {
    bestMonth = active.reduce((a, b) => (b.teQueda > a.teQueda ? b : a)).monthIndex;
    worstMonth = active.reduce((a, b) => (b.teQueda < a.teQueda ? b : a)).monthIndex;
  }

  const profitMargin = totals.entro > 0 ? totals.teQueda / totals.entro : 0;
  return {
    trend,
    balanceOverTime,
    topCategories: expenseCategories(project).slice(0, 6),
    profitMargin,
    bestMonth,
    worstMonth,
    totals,
  };
}
