import { useStore } from "@core/store";
import { monthsFull, monthsShort } from "@ui/util/months";

/** Locale-aware month labels bound to the current settings. */
export function useMonths(): { full: readonly string[]; short: readonly string[] } {
  const locale = useStore((s) => s.doc.settings.locale);
  return { full: monthsFull(locale), short: monthsShort(locale) };
}
