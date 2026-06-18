import type { Locale } from "../model/types";

/** Parse a raw cell string ("$1,200.50", "1.200,50", "300") into a number. */
export function parseMoney(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const s = raw.replace(/[^0-9.,-]/g, "").trim();
  if (!s || s === "-" || s === "." || s === ",") return 0;

  let normalized = s;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    normalized =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    normalized =
      parts.length === 2 && parts[1].length <= 2 ? parts[0] + "." + parts[1] : s.replace(/,/g, "");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function intlLocale(locale: Locale): string {
  return locale === "es" ? "es-MX" : "en-US";
}

export interface MoneyFormatOptions {
  currency: string;
  locale: Locale;
  decimals?: number;
}

export function formatMoney(value: number, opts: MoneyFormatOptions): string {
  const { currency, locale, decimals = 2 } = opts;
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `$${value.toFixed(decimals)}`;
  }
}
