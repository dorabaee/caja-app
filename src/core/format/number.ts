import type { Locale } from "../model/types";
import { intlLocale } from "./money";

export function formatNumber(value: number, locale: Locale, decimals = 0): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
}

export function formatPercent(value: number, locale: Locale, decimals = 0): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${(value * 100).toFixed(decimals)}%`;
  }
}
