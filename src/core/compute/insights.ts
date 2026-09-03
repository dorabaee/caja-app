import { parseMoney } from "../format/money";
import { categoryColumnOf, rowCategory } from "./categoryColumn";
import type { Month, Project, Table } from "../model/types";
import { tableTotal } from "./tables";
import { materializeMonth, materializedMonths, monthlyTotals, yearlyResumen } from "./monthly";

export interface KpiTableContribution {
  tableId: string;
  title: string;
  total: number;
  /** Currently opted out of its KPI total (ephemeral, see useUI.kpiExclusions). */
  excluded: boolean;
}

export interface KpiBreakdown {
  income: KpiTableContribution[];
  expense: KpiTableContribution[];
  entro: number;
  salio: number;
  teQueda: number;
}

/**
 * Which tables feed Entró / Salió, each with its contribution — the surface behind the
 * KPI hero (#11/#12). Excluded table ids are still listed (so they can be re-included)
 * but dropped from the sums. Ledger & "none" tables never participate.
 */
export function kpiBreakdown(month: Month, excluded?: ReadonlySet<string>): KpiBreakdown {
  const income: KpiTableContribution[] = [];
  const expense: KpiTableContribution[] = [];
  let entro = 0;
  let salio = 0;
  for (const t of month.tables) {
    if (t.kind !== "income" && t.kind !== "expense") continue;
    const isExcluded = excluded?.has(t.id) ?? false;
    const entry: KpiTableContribution = {
      tableId: t.id,
      title: t.title,
      total: tableTotal(t),
      excluded: isExcluded,
    };
    if (t.kind === "income") {
      income.push(entry);
      if (!isExcluded) entro += entry.total;
    } else {
      expense.push(entry);
      if (!isExcluded) salio += entry.total;
    }
  }
  return { income, expense, entro, salio, teQueda: entro - salio };
}

export interface CategorySlice {
  label: string;
  value: number;
}

/** What an un-categorised row is filed under when grouping by real categories. */
export const UNCATEGORIZED = "Sin categoría";

/**
 * The amount that represents an expense row in Resumen. Ordinary expense tables keep
 * their established first-money-column behaviour. A ledger is different: deposits are
 * money too, but only its explicitly marked withdrawal column is an expense.
 */
function expenseValueColumn(table: Table) {
  if (table.kind === "ledger") {
    return table.columns.find((c) => c.type === "money" && c.role === "withdrawal");
  }
  return table.columns.find((c) => c.type === "money");
}

/**
 * Group a single table's money total by its category column value.
 *
 * Picking a category writes its name into that column, so the column holds a mix of
 * real category names and free-typed descriptions. Pass `known` (the project's
 * categories) to keep only the former as their own group and fold everything else into
 * "Sin categoría"; omit it to group by the raw text, description and all.
 */
export function categoryBreakdownForTable(table: Table, known?: string[]): CategorySlice[] {
  const catCol =
    categoryColumnOf(table) ?? table.columns.find((c) => c.type === "text") ?? null;
  const moneyCol = expenseValueColumn(table);
  if (!catCol || !moneyCol) return [];
  const canon = known && new Map(known.map((n) => [n.trim().toLowerCase(), n]));
  const map = new Map<string, number>();
  for (const row of table.rows) {
    const amount = parseMoney(row.cells[moneyCol.id]);
    if (amount === 0) continue;
    // Grouping by category reads the row's own category; grouping by description reads
    // the text. They are two different fields now, so "Gasolina de la camioneta" and
    // "Gasolina personal" can be separate descriptions under one category.
    const raw = known
      ? (row.category ?? rowCategory(table, row)).trim()
      : (row.cells[catCol.id] || "").trim();
    const label = canon ? (canon.get(raw.toLowerCase()) ?? UNCATEGORIZED) : raw || UNCATEGORIZED;
    map.set(label, (map.get(label) ?? 0) + amount);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export interface CategoryYearRow {
  label: string;
  /** Expense per month (length 12). */
  byMonth: number[];
  /** Year total for this category. */
  total: number;
}

/**
 * Expense categories across the year with a per-month breakdown (#16) — for the
 * Resumen's search / sort / highlight. Aggregates every expense table's category
 * breakdown by category name into a 12-month vector. Sorted by year total desc.
 *
 * With `byCategory`, rows are grouped by the project's real categories (anything else
 * folded into "Sin categoría"); without it, by the raw description text. `group` filters
 * by the source table's fiscal flag. Category groups still organise the picker, but do
 * not decide whether money belongs to the fiscal or non-fiscal account view.
 */
export function monthlyExpenseCategories(
  project: Project,
  opts?: { byCategory?: boolean; group?: "fiscal" | "noFiscal" },
): CategoryYearRow[] {
  const known = opts?.byCategory ? (project.categories ?? []).map((c) => c.name) : undefined;
  const map = new Map<string, number[]>();
  materializedMonths(project).forEach((m, i) => {
    for (const t of m.tables) {
      // Ledgers contribute their withdrawals; deposits are excluded by
      // `expenseValueColumn`. Income and neutral tables are not expense sources.
      if (t.kind !== "expense" && t.kind !== "ledger") continue;
      if (opts?.group === "fiscal" && !t.fiscal) continue;
      if (opts?.group === "noFiscal" && t.fiscal) continue;
      for (const slice of categoryBreakdownForTable(t, known)) {
        let arr = map.get(slice.label);
        if (!arr) {
          arr = new Array(12).fill(0);
          map.set(slice.label, arr);
        }
        arr[i] += slice.value;
      }
    }
  });
  return [...map.entries()]
    .map(([label, byMonth]) => ({ label, byMonth, total: byMonth.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
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
