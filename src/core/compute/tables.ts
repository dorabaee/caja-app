import { parseMoney } from "../format/money";
import type { Column, Table } from "../model/types";

export function moneyColumns(table: Table): Column[] {
  return table.columns.filter((c) => c.type === "money");
}

/** Sum of every money cell across all money columns — the table's "Total". */
export function tableTotal(table: Table): number {
  let sum = 0;
  for (const c of moneyColumns(table)) {
    for (const row of table.rows) sum += parseMoney(row.cells[c.id]);
  }
  return sum;
}

/** Per money-column totals, keyed by column id. */
export function columnTotals(table: Table): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of moneyColumns(table)) {
    let s = 0;
    for (const row of table.rows) s += parseMoney(row.cells[c.id]);
    out[c.id] = s;
  }
  return out;
}

export interface LedgerResult {
  initial: number;
  deposits: number;
  withdrawals: number;
  finalBalance: number;
}

/** Bank-ledger balance: initial + deposits − withdrawals (by column role). */
export function ledgerBalance(table: Table): LedgerResult {
  const initial = table.initialBalance ?? 0;
  let deposits = 0;
  let withdrawals = 0;
  for (const c of moneyColumns(table)) {
    let s = 0;
    for (const row of table.rows) s += parseMoney(row.cells[c.id]);
    if (c.role === "withdrawal") withdrawals += s;
    else deposits += s; // money columns default to deposits unless flagged withdrawal
  }
  return { initial, deposits, withdrawals, finalBalance: initial + deposits - withdrawals };
}
