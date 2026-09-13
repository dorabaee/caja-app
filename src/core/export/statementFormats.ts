import type { Statement, StatementMonth } from "./statement";

export const STATEMENT_FORMATS = ["simple", "detailed", "monthly", "commonSize", "quarterly", "cumulative"] as const;
export type StatementFormat = (typeof STATEMENT_FORMATS)[number];
export interface StatementOptions {
  formats: StatementFormat[];
  charts: boolean;
  throughMonth: number;
}
export const DEFAULT_STATEMENT_OPTIONS: StatementOptions = {
  formats: ["simple", "detailed", "monthly"], charts: false, throughMonth: 11,
};

export function normalizeStatementOptions(options: StatementOptions): StatementOptions {
  const formats = STATEMENT_FORMATS.filter((format) => options.formats.includes(format));
  if (!formats.length) throw new Error("Select at least one statement format");
  if (!Number.isInteger(options.throughMonth) || options.throughMonth < 0 || options.throughMonth > 11)
    throw new Error("Invalid statement cutoff month");
  return { formats, charts: options.charts, throughMonth: options.throughMonth };
}

export function quarterlyStatement(s: Statement): StatementMonth[] {
  return Array.from({ length: 4 }, (_, quarter) => {
    const months = s.months.filter((m) => Math.floor(m.monthIndex / 3) === quarter);
    const entro = months.reduce((sum, m) => sum + m.entro, 0);
    const salio = months.reduce((sum, m) => sum + m.salio, 0);
    return { monthIndex: quarter, entro, salio, saldo: entro - salio };
  });
}

export function cumulativeStatement(s: Statement, throughMonth: number): StatementMonth[] {
  let entro = 0;
  let salio = 0;
  return s.months.filter((m) => m.monthIndex <= throughMonth).map((m) => {
    entro += m.entro;
    salio += m.salio;
    return { monthIndex: m.monthIndex, entro, salio, saldo: entro - salio };
  });
}

/** Undefined ratios stay undefined: zero income does not imply a 0% expense rate. */
export function shareOfIncome(value: number, income: number): number | null {
  return income === 0 ? null : value / income;
}
