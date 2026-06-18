import type { Project } from "../model/types";
import { allBusinessesMetrics } from "../compute/insights";
import { buildStatement } from "./statement";

/**
 * Excel (.xlsx) export. `xlsx` (SheetJS) is heavy and carries a known npm-audit
 * advisory, so it is lazy-imported only when the user actually exports — it never
 * lands in the initial bundle. Numbers are written as real numbers (formatted
 * #,##0.00) so the user's Excel locale renders them natively.
 */

const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTHS_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MONEY_FMT = "#,##0.00";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Aoa = Array<Array<string | number>>;
// Minimal structural types — avoids depending on xlsx's types at module load.
type Sheet = Record<string, { t?: string; z?: string }>;
type XlsxLib = typeof import("xlsx");
type WorkBook = ReturnType<XlsxLib["utils"]["book_new"]>;

/** Give every numeric cell the money format so totals read cleanly. */
function formatMoney(ws: Sheet): void {
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (cell && cell.t === "n") cell.z = MONEY_FMT;
  }
}

function sheetFromAoa(XLSX: XlsxLib, aoa: Aoa, cols: number[]): Sheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa) as Sheet;
  formatMoney(ws);
  (ws as Record<string, unknown>)["!cols"] = cols.map((wch) => ({ wch }));
  return ws;
}

function workbookToBlob(XLSX: XlsxLib, wb: WorkBook): Blob {
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([out], { type: XLSX_MIME });
}

/** Per-business workbook: a "Resumen del año" sheet + a "Comparativo mensual" matrix. */
export async function buildProjectWorkbookBlob(project: Project): Promise<Blob> {
  const XLSX = await import("xlsx");
  const s = buildStatement(project);
  const wb = XLSX.utils.book_new();

  const resumen: Aoa = [["Mes", "Entró", "Salió", "Saldo"]];
  for (const m of s.months) resumen.push([MONTHS_FULL[m.monthIndex], m.entro, m.salio, m.saldo]);
  resumen.push(["Total del año", s.totals.entro, s.totals.salio, s.totals.teQueda]);
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa(XLSX, resumen, [16, 13, 13, 13]),
    "Resumen del año",
  );

  const months = s.months;
  const comparativo: Aoa = [
    ["Concepto", ...months.map((m) => MONTHS_SHORT[m.monthIndex]), "Total"],
    ["Entró", ...months.map((m) => m.entro), s.totals.entro],
    ["Salió", ...months.map((m) => m.salio), s.totals.salio],
    ["Saldo", ...months.map((m) => m.saldo), s.totals.teQueda],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa(XLSX, comparativo, [10, ...months.map(() => 9), 11]),
    "Comparativo mensual",
  );

  return workbookToBlob(XLSX, wb);
}

/** Cross-business workbook: one row per negocio + a total row. */
export async function buildAllBusinessesWorkbookBlob(projects: Project[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const m = allBusinessesMetrics(projects);
  const wb = XLSX.utils.book_new();

  const negocios: Aoa = [["Negocio", "Entró", "Salió", "Saldo"]];
  for (const b of m.businesses) negocios.push([b.name, b.totals.entro, b.totals.salio, b.totals.teQueda]);
  negocios.push(["Total", m.totals.entro, m.totals.salio, m.totals.teQueda]);
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa(XLSX, negocios, [24, 14, 14, 14]),
    "Todos los negocios",
  );

  return workbookToBlob(XLSX, wb);
}
