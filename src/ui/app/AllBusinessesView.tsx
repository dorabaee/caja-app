import { TrendingUp, TrendingDown, Scale, Percent, Layers, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { allBusinessesMetrics } from "@core/compute";
import { useStore } from "@core/store";
import { useFormat } from "@ui/hooks/useFormat";
import { StatCard } from "@ui/widgets/StatCard";
import { ChartCard, TrendBars, BalanceArea, RankedBars } from "@ui/widgets/MiniChart";
import styles from "./AllBusinesses.module.css";

export function AllBusinessesView() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const fmt = useFormat();

  const m = allBusinessesMetrics(projects);
  const active = m.totals.entro !== 0 || m.totals.salio !== 0;
  const comparison = m.businesses
    .map((b) => ({ label: b.name, value: b.totals.teQueda }))
    .sort((a, b) => b.value - a.value);
  const hasCategories = m.topCategories.length > 0;

  return (
    <div className={styles.wrap}>
      <header className={styles.lead}>
        <div className={styles.leadTitle}>
          <Layers size={18} aria-hidden />
          <h1>{t("dash.allBusinesses")}</h1>
        </div>
        <span className={styles.currencyNote}>
          <Info size={13} aria-hidden />
          {t("dash.businessesNote", { count: m.businesses.length, currency: fmt.currency })}
        </span>
      </header>

      {!active ? (
        <p className={styles.emptyText}>
          {t("dash.allEmptyText")}
        </p>
      ) : (
        <>
          <div className={styles.stats}>
            <StatCard label={t("dash.combinedBalance")} tone="accent" icon={<Scale size={16} />} value={fmt.money(m.totals.teQueda)} sub={
              <span className={styles.subLine}>
                <Percent size={12} aria-hidden /> {t("dash.margin", { value: fmt.percent(m.profitMargin) })}
              </span>
            } />
            <StatCard label={t("dash.inAll")} tone="income" icon={<TrendingUp size={16} />} value={fmt.money(m.totals.entro)} />
            <StatCard label={t("dash.outAll")} tone="expense" icon={<TrendingDown size={16} />} value={fmt.money(m.totals.salio)} />
          </div>

          <div className={styles.charts}>
            <ChartCard title={t("dash.balanceByBusiness")} span="full" hint={t("dash.yearComparison")}>
              <RankedBars items={comparison} signed />
            </ChartCard>

            <ChartCard title={t("dash.inVsOutByMonth")} span="full" tall hint={t("dash.sumAllBusinesses")}>
              <TrendBars trend={m.trend} />
            </ChartCard>

            <ChartCard title={t("dash.combinedCarryOver")} hint={t("dash.monthByMonth")}>
              <BalanceArea data={m.balanceOverTime} gradientId="allbiz-bal" />
            </ChartCard>

            <ChartCard title={t("dash.expensesByCategory")} empty={!hasCategories} hint={hasCategories ? t("dash.allBusinessesHint") : undefined}>
              <RankedBars items={m.topCategories} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
