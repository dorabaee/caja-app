import { useTranslation } from "react-i18next";
import { TableProperties, Plus, ArrowRightLeft } from "lucide-react";
import { useUI } from "@core/store";
import { carryOverStart, materializeMonth, monthlyTotals } from "@core/compute";
import { Button } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { TableWidget } from "@ui/widgets/TableWidget";
import { LedgerWidget } from "@ui/widgets/LedgerWidget";
import { ChartWidget } from "@ui/widgets/ChartWidget";
import { KpiHero } from "./KpiHero";
import { AddTableMenu } from "./AddTableMenu";
import { MonthCanvas } from "./MonthCanvas";
import { QuickAddBar } from "./QuickAddBar";
import styles from "./MonthView.module.css";

export function MonthView() {
  const project = useCurrentProject();
  const monthIndex = useUI((s) => s.monthIndex);
  const view = useUI((s) => s.view);
  const fmt = useFormat();
  const { t } = useTranslation();
  const months = useMonths();

  if (!project) return null;
  const month = project.months[monthIndex];
  const totals = monthlyTotals(materializeMonth(project, monthIndex));
  const hasWidgets = month.tables.length > 0 || month.charts.length > 0;

  const carry = project.carryOver ? carryOverStart(project, monthIndex) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.heroBand} data-tour="kpi">
        <KpiHero totals={totals} goal={project.goal?.monthlyProfitTarget} />
        {carry != null && (
          <div className={styles.carryStrip}>
            <span className={styles.carryItem}>
              <ArrowRightLeft size={13} aria-hidden />
              {t("month.carryStart")}
              <b className="tnum">{fmt.money(carry)}</b>
            </span>
            <span className={styles.carrySep} aria-hidden>
              →
            </span>
            <span className={styles.carryItem}>
              {t("month.carryRunning")}
              <b className="tnum">{fmt.money(carry + totals.teQueda)}</b>
            </span>
          </div>
        )}
        {hasWidgets && <QuickAddBar monthIndex={monthIndex} />}
      </div>

      {!hasWidgets ? (
        <div className={styles.region}>
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <TableProperties size={26} />
            </span>
            <h2 className={styles.emptyTitle}>
              {t("month.emptyTitle", { month: months.full[monthIndex] })}
            </h2>
            <p className={styles.emptyText}>{t("month.emptyText")}</p>
            <AddTableMenu
              trigger={
                <Button variant="primary" icon={<Plus />}>
                  {t("month.addTable")}
                </Button>
              }
            />
          </div>
        </div>
      ) : view === "list" ? (
        <div className={styles.regionScroll}>
          <div className={styles.list}>
            {month.tables.map((t) =>
              t.kind === "ledger" ? (
                <LedgerWidget key={t.id} monthIndex={monthIndex} table={t} />
              ) : (
                <TableWidget key={t.id} monthIndex={monthIndex} table={t} />
              ),
            )}
            {month.charts.map((c) => (
              <ChartWidget key={c.id} monthIndex={monthIndex} chart={c} tables={month.tables} />
            ))}
          </div>
        </div>
      ) : (
        <MonthCanvas monthIndex={monthIndex} month={month} />
      )}
    </div>
  );
}
