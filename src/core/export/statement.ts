import type { Project } from "../model/types";
import { dashboardMetrics } from "../compute/insights";
import { yearlyResumen } from "../compute/monthly";

/** One month's Entró / Salió / Saldo for the comparative statement. */
export interface StatementMonth {
  monthIndex: number;
  entro: number;
  salio: number;
  saldo: number;
}

/**
 * The "Estado de resultados" data model — every number the PDF / CSV / Excel
 * exports render, sourced entirely from the tested compute layer so all
 * surfaces (UI, PDF, CSV, Excel) agree to the cent.
 */
export interface Statement {
  businessName: string;
  year: number;
  totals: { entro: number; salio: number; teQueda: number };
  /** 12 months, indexed 0–11. */
  months: StatementMonth[];
  bestMonth: number | null;
  worstMonth: number | null;
  /** Te queda ÷ Entró (0..1); 0 when there was no income. */
  profitMargin: number;
  /** Te queda spread evenly across the 12 months. */
  monthlyAverage: number;
  positiveMonths: number;
  negativeMonths: number;
}

/** The year a project's data belongs to (single-year app — derived from creation). */
export function statementYear(project: Project): number {
  const d = project.createdAt ? new Date(project.createdAt) : new Date();
  const y = d.getFullYear();
  return Number.isFinite(y) && y > 1971 ? y : new Date().getFullYear();
}

export function buildStatement(project: Project): Statement {
  const { months, totals } = yearlyResumen(project);
  const { bestMonth, worstMonth, profitMargin } = dashboardMetrics(project);

  let positiveMonths = 0;
  let negativeMonths = 0;
  for (const m of months) {
    if (m.teQueda > 0) positiveMonths += 1;
    else if (m.teQueda < 0) negativeMonths += 1;
  }

  return {
    businessName: project.name?.trim() || "Negocio sin nombre",
    year: statementYear(project),
    totals,
    months: months.map((m) => ({
      monthIndex: m.monthIndex,
      entro: m.entro,
      salio: m.salio,
      saldo: m.teQueda,
    })),
    bestMonth,
    worstMonth,
    profitMargin,
    monthlyAverage: totals.teQueda / 12,
    positiveMonths,
    negativeMonths,
  };
}
