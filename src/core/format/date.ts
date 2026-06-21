import { addDays, format, parse, isValid } from "date-fns";
import { enUS, es } from "date-fns/locale";
import type { Locale } from "../model/types";

function dfnsLocale(locale: Locale) {
  return locale === "es" ? es : enUS;
}

/** Best-effort parse of a date cell value into a Date (or null).
 *  Calendar-date strings (no time component) are parsed as LOCAL dates — a date
 *  cell has no timezone, and parsing `yyyy-MM-dd` via `new Date()` would treat it
 *  as UTC midnight, shifting the day in non-UTC zones. */
export function parseDateCell(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // Full ISO datetime (has a time part): let the platform parse it, timezone intact.
  if (/\d{4}-\d{2}-\d{2}[T ]/.test(s)) {
    const dt = new Date(s);
    if (isValid(dt)) return dt;
  }
  // Calendar-date formats, parsed as local dates. yyyy-MM-dd first (unambiguous);
  // MM/dd before dd/MM preserves the original slash-format precedence.
  for (const fmt of ["yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "M/d/yyyy", "d/M/yyyy"]) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }
  const fallback = new Date(s);
  return isValid(fallback) ? fallback : null;
}

/** The day after a parseable date cell, as a `yyyy-MM-dd` string (the format the native
 *  date input emits). Returns null when the value isn't a recognizable date. */
export function nextDateCell(raw: string | null | undefined): string | null {
  const d = parseDateCell(raw);
  if (!d) return null;
  return format(addDays(d, 1), "yyyy-MM-dd");
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
