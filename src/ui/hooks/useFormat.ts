import { useMemo } from "react";
import { useStore } from "@core/store";
import { formatMoney } from "@core/format/money";
import { formatNumber, formatPercent } from "@core/format/number";

/** Formatters bound to the current settings (currency / locale / decimals). */
export function useFormat() {
  const currency = useStore((s) => s.doc.settings.currency);
  const locale = useStore((s) => s.doc.settings.locale);
  const decimals = useStore((s) => s.doc.settings.decimals);

  return useMemo(
    () => ({
      locale,
      currency,
      decimals,
      /** Full currency string, e.g. "$1,200.00". */
      money: (n: number) => formatMoney(n, { currency, locale, decimals }),
      /** Number without currency symbol — for dense in-grid totals. */
      moneyPlain: (n: number) => formatNumber(n, locale, decimals),
      number: (n: number, d = 0) => formatNumber(n, locale, d),
      percent: (n: number, d = 0) => formatPercent(n, locale, d),
    }),
    [currency, locale, decimals],
  );
}
