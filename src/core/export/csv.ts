import type { Project } from "../model/types";
import { allBusinessesMetrics } from "../compute/insights";
import { buildStatement } from "./statement";

/**
 * Hand-rolled CSV (RFC 4180): comma delimiter, dot-decimal numbers, CRLF rows,
 * fields quoted only when needed. Deliberately locale-neutral so the file
 * re-imports cleanly anywhere; the Excel export covers the locale-native case.
 */

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export interface CsvOptions {
  decimals?: number;
}

function cell(value: string | number, decimals: number): string {
  const s = typeof value === "number" ? value.toFixed(decimals) : value;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Array<Array<string | number>>, decimals: number): string {
  return rows.map((r) => r.map((c) => cell(c, decimals)).join(",")).join("\r\n");
}

/** Yearly resumen: a row per month (Mes, Entró, Salió, Saldo) + total row. */
export function resumenToCsv(project: Project, opts: CsvOptions = {}): string {
  const decimals = opts.decimals ?? 2;
  const s = buildStatement(project);
  const rows: Array<Array<string | number>> = [["Mes", "Entró", "Salió", "Saldo"]];
  for (const m of s.months) {
    rows.push([MONTHS_ES[m.monthIndex], m.entro, m.salio, m.saldo]);
  }
  rows.push(["Total del año", s.totals.entro, s.totals.salio, s.totals.teQueda]);
  return toCsv(rows, decimals);
}

/** All businesses: a row per negocio (Negocio, Entró, Salió, Saldo) + total row. */
export function allBusinessesToCsv(projects: Project[], opts: CsvOptions = {}): string {
  const decimals = opts.decimals ?? 2;
  const m = allBusinessesMetrics(projects);
  const rows: Array<Array<string | number>> = [["Negocio", "Entró", "Salió", "Saldo"]];
  for (const b of m.businesses) {
    rows.push([b.name, b.totals.entro, b.totals.salio, b.totals.teQueda]);
  }
  rows.push(["Total", m.totals.entro, m.totals.salio, m.totals.teQueda]);
  return toCsv(rows, decimals);
}
