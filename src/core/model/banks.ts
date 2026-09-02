import type { BankKey } from "./types";

/**
 * Bank tags for fiscal tables. These are labels, not connections — nothing here talks
 * to a bank. Each entry carries the brand's own colours so the chip is recognisable at
 * a glance without shipping trademarked logo artwork; `short` is the 3-letter mark drawn
 * inside the chip's square.
 */
export interface BankMeta {
  key: BankKey;
  label: string;
  short: string;
  /** Chip text + mark colour. */
  color: string;
  /** Chip background (a light tint of `color`). */
  tint: string;
}

export const BANKS: readonly BankMeta[] = [
  { key: "banorte", label: "Banorte", short: "BNT", color: "#c8102e", tint: "#fbe9ec" },
  { key: "santander", label: "Santander", short: "SAN", color: "#ec0000", tint: "#fde8e8" },
  { key: "bbva", label: "BBVA", short: "BBV", color: "#004481", tint: "#e5eef6" },
  { key: "mercadopago", label: "Mercado Pago", short: "MP", color: "#00A2E1", tint: "#e4f5fd" },
  { key: "spin", label: "Spin by OXXO", short: "SPN", color: "#E4022D", tint: "#fde8ec" },
  { key: "coppel", label: "Coppel", short: "CPL", color: "#004E9A", tint: "#e5eff8" },
] as const;

const BY_KEY = new Map(BANKS.map((b) => [b.key, b]));

export function bankMeta(key: BankKey | undefined): BankMeta | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}
