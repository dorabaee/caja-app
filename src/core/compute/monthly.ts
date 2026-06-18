import type { Month, Project } from "../model/types";
import { tableTotal } from "./tables";
import { recurringRowsFor } from "./recurring";

export interface MonthlyTotals {
  entro: number;
  salio: number;
  teQueda: number;
}

/**
 * The month as seen at read-time: each table gets its recurring occurrences
 * injected (non-destructively). Returns the original month unchanged when the
 * project defines no recurring rows, so existing behavior is preserved exactly.
 */
export function materializeMonth(project: Project, monthIndex: number): Month {
  const month = project.months[monthIndex];
  if (!month || !project.recurring?.length) return month;
  // Defs match tables by title; if two tables share a title, inject only into the
  // first so the recurring amount is never counted twice in the month's totals.
  const injected = new Set<string>();
  return {
    charts: month.charts,
    tables: month.tables.map((t) => {
      if (injected.has(t.title)) return t;
      const extra = recurringRowsFor(project, monthIndex, t);
      if (!extra.length) return t;
      injected.add(t.title);
      return { ...t, rows: [...t.rows, ...extra] };
    }),
  };
}

/** Every month of a project with recurring rows materialized in. */
export function materializedMonths(project: Project): Month[] {
  return project.months.map((_, i) => materializeMonth(project, i));
}

/** Entró = Σ income tables, Salió = Σ expense tables. Ledger & "none" excluded. */
export function monthlyTotals(month: Month): MonthlyTotals {
  let entro = 0;
  let salio = 0;
  for (const t of month.tables) {
    if (t.kind === "income") entro += tableTotal(t);
    else if (t.kind === "expense") salio += tableTotal(t);
  }
  return { entro, salio, teQueda: entro - salio };
}

export interface MonthSummary extends MonthlyTotals {
  monthIndex: number;
}

export function yearlyResumen(project: Project): {
  months: MonthSummary[];
  totals: MonthlyTotals;
} {
  const months = materializedMonths(project).map((m, i) => ({ monthIndex: i, ...monthlyTotals(m) }));
  const totals = months.reduce<MonthlyTotals>(
    (acc, m) => ({
      entro: acc.entro + m.entro,
      salio: acc.salio + m.salio,
      teQueda: acc.teQueda + m.teQueda,
    }),
    { entro: 0, salio: 0, teQueda: 0 },
  );
  return { months, totals };
}

/** Running balance across the 12 months (initial balance + each month's net). */
export function cumulativeBalances(project: Project): number[] {
  let running = project.initialBalance ?? 0;
  return materializedMonths(project).map((m) => {
    running += monthlyTotals(m).teQueda;
    return running;
  });
}

/** Starting balance for a month when carry-over is enabled. */
export function carryOverStart(project: Project, monthIndex: number): number {
  const start = project.initialBalance ?? 0;
  if (!project.carryOver || monthIndex <= 0) return start;
  return cumulativeBalances(project)[monthIndex - 1];
}
