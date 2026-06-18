import { useTranslation } from "react-i18next";
import { useUI } from "@core/store";
import { cn } from "@ui/common";
import { useMonths } from "@ui/hooks/useMonths";
import styles from "./MonthStrip.module.css";

export function MonthStrip() {
  const { t } = useTranslation();
  const months = useMonths();
  const monthIndex = useUI((s) => s.monthIndex);
  const nav = useUI((s) => s.nav);
  const setMonth = useUI((s) => s.setMonth);
  const goTo = useUI((s) => s.goTo);
  const resumen = nav === "resumen";

  return (
    <nav className={styles.strip} aria-label={t("shell.monthsOfYear")} data-tour="months">
      <div className={styles.months}>
        {months.short.map((label, i) => {
          const active = nav === "month" && monthIndex === i;
          return (
            <button
              key={i}
              type="button"
              className={cn(styles.tab, active && styles.active)}
              aria-current={active ? "true" : undefined}
              onClick={() => setMonth(i)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={cn(styles.tab, styles.resumen, resumen && styles.active)}
        aria-current={resumen ? "true" : undefined}
        onClick={() => goTo("resumen")}
      >
        {t("shell.summary")}
      </button>
    </nav>
  );
}
