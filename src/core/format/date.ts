import { format, parse, isValid } from "date-fns";
import { enUS, es } from "date-fns/locale";
import type { Locale } from "../model/types";

function dfnsLocale(locale: Locale) {
  return locale === "es" ? es : enUS;
}

/** Best-effort parse of a date cell value into a Date (or null). */
export function parseDateCell(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // ISO first
  const iso = new Date(s);
  if (isValid(iso) && /\d{4}-\d{2}-\d{2}/.test(s)) return iso;
  for (const fmt of ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "M/d/yyyy", "d/M/yyyy"]) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }
  return isValid(iso) ? iso : null;
}

export function formatDateCell(raw: string | null | undefined, locale: Locale): string {
  const d = parseDateCell(raw);
  if (!d) return raw ?? "";
  return format(d, "dd/MM/yyyy", { locale: dfnsLocale(locale) });
}

/** "1 de enero" style for PDF/report ranges. */
export function formatLongDate(d: Date, locale: Locale): string {
  return format(d, locale === "es" ? "d 'de' MMMM 'de' yyyy" : "MMMM d, yyyy", {
    locale: dfnsLocale(locale),
  });
}
