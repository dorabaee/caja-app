import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { yearlyResumen } from "@core/compute";
import { useUI } from "@core/store";
import { Button, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { KpiHero } from "./KpiHero";
import styles from "./ResumenView.module.css";

export function ResumenView() {
  const { t } = useTranslation();
  const monthLabels = useMonths();
  const project = useCurrentProject();
  const fmt = useFormat();
  const openModal = useUI((s) => s.openModal);
  if (!project) return null;

  const { months, totals } = yearlyResumen(project);

  return (
    <div className={styles.wrap}>
      <KpiHero
        totals={totals}
        labels={{ entro: t("dash.yearIn"), salio: t("dash.yearOut"), teQueda: t("dash.yearBalance") }}
      />

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thMonth}>{t("dash.monthHeader")}</th>
              <th className={styles.thNum}>{t("dash.inHeader")}</th>
              <th className={styles.thNum}>{t("dash.outHeader")}</th>
              <th className={styles.thNum}>{t("dash.balanceHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const active = m.entro !== 0 || m.salio !== 0;
              return (
                <tr key={m.monthIndex} className={cn(active && styles.activeRow)}>
                  <td className={styles.tdMonth}>{monthLabels.full[m.monthIndex]}</td>
                  <td className={cn(styles.tdNum, "tnum", active && styles.income)}>{fmt.moneyPlain(m.entro)}</td>
                  <td className={cn(styles.tdNum, "tnum", active && styles.expense)}>{fmt.moneyPlain(m.salio)}</td>
                  <td className={cn(styles.tdNum, "tnum", active && styles.saldo)}>{fmt.moneyPlain(m.teQueda)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td className={styles.tdMonth}>{t("dash.yearTotal")}</td>
              <td className={cn(styles.tdNum, "tnum", styles.income)}>{fmt.moneyPlain(totals.entro)}</td>
              <td className={cn(styles.tdNum, "tnum", styles.expense)}>{fmt.moneyPlain(totals.salio)}</td>
              <td className={cn(styles.tdNum, "tnum", styles.saldo)}>{fmt.moneyPlain(totals.teQueda)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" icon={<Share2 />} onClick={() => openModal("share")}>
          {t("dash.shareSummary")}
        </Button>
      </div>
    </div>
  );
}
