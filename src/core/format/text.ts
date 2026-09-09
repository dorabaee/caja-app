import type { Locale } from "@core/model/types";

/** Normalize user-entered free text when the global table preference is enabled. */
export function normalizeTextCell(value: string, uppercase: boolean, locale: Locale): string {
  return uppercase ? value.toLocaleUpperCase(locale === "es" ? "es-MX" : "en-US") : value;
}
