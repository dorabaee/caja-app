import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TableProperties, Plus, ArrowRightLeft, Send, X, ChevronRight } from "lucide-react";
import { useUI } from "@core/store";
import { carryOverStart, fiscalTotal, hasFiscalTable, kpiBreakdown, materializeMonth } from "@core/compute";
import { Button } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { TableWidget } from "@ui/widgets/TableWidget";
import { LedgerWidget } from "@ui/widgets/LedgerWidget";
import { ChartWidget } from "@ui/widgets/ChartWidget";
import { KpiHero } from "./KpiHero";
import { KpiBreakdownMenu } from "./KpiBreakdownMenu";
import { AddTableMenu } from "./AddTableMenu";
import { MonthCanvas } from "./MonthCanvas";
import styles from "./MonthView.module.css";

export function MonthView() {
  const project = useCurrentProject();
  const monthIndex = useUI((s) => s.monthIndex);
  const view = useUI((s) => s.view);
  const kpiExclusions = useUI((s) => s.kpiExclusions);
  const hiddenWidgets = useUI((s) => s.hiddenWidgets);
  const balanceMode = useUI((s) => s.balanceMode);
  const toggleBalanceMode = useUI((s) => s.toggleBalanceMode);
  const sendValue = useUI((s) => s.sendValue);
  const cancelSendValue = useUI((s) => s.cancelSendValue);
  const fmt = useFormat();
  const { t } = useTranslation();
  const months = useMonths();

  // Esc cancels an in-progress "send a value" flow (#7).
  useEffect(() => {
    if (!sendValue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelSendValue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendValue, cancelSendValue]);

  if (!project) return null;
  const month = project.months[monthIndex];
  // Breakdown drives both the totals shown and the per-card menus (#11/#12); exclusions
  // are an ephemeral what-if applied here in the month view only.
  const materialized = materializeMonth(project, monthIndex);
  const breakdown = kpiBreakdown(materialized, kpiExclusions);
  // The third card flips between the month's net and the fiscal tables' saldo final (#1);
  // the toggle only appears once something in the month is marked fiscal.
  const canShowSaldo = hasFiscalTable(materialized);
  const showSaldo = canShowSaldo && balanceMode === "saldoFinal";
  const totals = {
    entro: breakdown.entro,
    salio: breakdown.salio,
    teQueda: showSaldo ? fiscalTotal(materialized, kpiExclusions) : breakdown.teQueda,
  };
  const hasWidgets = month.tables.length > 0 || month.charts.length > 0;

  const carry = project.carryOver ? carryOverStart(project, monthIndex) : null;

  return (
    <div className={styles.wrap}>
      {!hiddenWidgets.has("kpi") && <div className={styles.heroBand} data-tour="kpi">
        <KpiHero
          totals={totals}
          goal={showSaldo ? undefined : project.goal?.monthlyProfitTarget}
          labels={
            showSaldo
              ? { entro: t("month.entro"), salio: t("month.salio"), teQueda: t("widgets.finalBalance") }
              : undefined
          }
          menus={{
            entro: <KpiBreakdownMenu kind="income" contributions={breakdown.income} monthIndex={monthIndex} />,
            salio: <KpiBreakdownMenu kind="expense" contributions={breakdown.expense} monthIndex={monthIndex} />,
            teQueda: canShowSaldo ? (
              <button
                type="button"
                className={styles.balanceToggle}
                title={showSaldo ? t("month.showTeQueda") : t("month.showSaldoFinal")}
                aria-label={showSaldo ? t("month.showTeQueda") : t("month.showSaldoFinal")}
                onClick={toggleBalanceMode}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            ) : undefined,
          }}
        />
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
      </div>}

      {sendValue && (
        <div className={styles.sendBanner} role="status">
          <Send size={15} aria-hidden />
          <span>{t("month.sendBanner", { value: fmt.money(Number(sendValue.value) || 0) })}</span>
          <button type="button" className={styles.sendCancel} onClick={cancelSendValue}>
            <X size={14} aria-hidden /> {t("month.sendCancel")}
          </button>
        </div>
      )}

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
