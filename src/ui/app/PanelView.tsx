import { TrendingUp, TrendingDown, Scale, Percent, ArrowUpRight, ArrowDownRight, LineChart, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { dashboardMetrics, projectHasActivity } from "@core/compute";
import { Button, cn } from "@ui/common";
import { useUI } from "@core/store";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { StatCard } from "@ui/widgets/StatCard";
import { ChartCard, TrendBars, BalanceArea, ProfitBars, RankedBars } from "@ui/widgets/MiniChart";
import styles from "./Panel.module.css";

export function PanelView() {
  const { t } = useTranslation();
  const months = useMonths();
  const project = useCurrentProject();
  const fmt = useFormat();
  const setMonth = useUI((s) => s.setMonth);
  const monthIndex = useUI((s) => s.monthIndex);
  if (!project) return null;

  const m = dashboardMetrics(project);
  const goal = project.goal?.monthlyProfitTarget;
  const hasCategories = m.topCategories.length > 0;

  if (!projectHasActivity(project)) {
    return (
      <div className={styles.wrap}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden>
            <LineChart size={26} />
          </span>
          <h2 className={styles.emptyTitle}>{t("dash.emptyTitle")}</h2>
          <p className={styles.emptyText}>
            {t("dash.emptyText")}
          </p>
          <Button variant="primary" onClick={() => setMonth(monthIndex)}>
            {t("dash.goToBoard")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.stats}>
        <StatCard
          label={t("dash.yearBalance")}
          tone="accent"
          icon={<Scale size={16} />}
          value={fmt.money(m.totals.teQueda)}
          sub={
            <span className={styles.statSubLine}>
              <Percent size={12} aria-hidden /> {t("dash.margin", { value: fmt.percent(m.profitMargin) })}
            </span>
          }
        />
        <StatCard label={t("dash.yearIn")} tone="income" icon={<TrendingUp size={16} />} value={fmt.money(m.totals.entro)} />
        <StatCard label={t("dash.yearOut")} tone="expense" icon={<TrendingDown size={16} />} value={fmt.money(m.totals.salio)} />
        <div className={cn(styles.stat, styles.monthsCard)}>
          <div className={styles.monthRow}>
            <span className={styles.monthBadge}>
              <ArrowUpRight size={14} aria-hidden />
            </span>
            <span className={styles.monthLabel}>{t("dash.bestMonth")}</span>
            <span className={cn(styles.monthValue, "tnum")}>
              {m.bestMonth != null ? months.full[m.bestMonth] : "—"}
            </span>
          </div>
          <div className={styles.monthDivider} />
          <div className={styles.monthRow}>
            <span className={cn(styles.monthBadge, styles.monthBadgeDown)}>
              <ArrowDownRight size={14} aria-hidden />
            </span>
            <span className={styles.monthLabel}>{t("dash.worstMonth")}</span>
            <span className={cn(styles.monthValue, "tnum")}>
              {m.worstMonth != null ? months.full[m.worstMonth] : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.charts}>
        <ChartCard title={t("dash.inVsOutByMonth")} span="full" tall hint={t("dash.yearMovement")}>
          <TrendBars trend={m.trend} />
        </ChartCard>

        <ChartCard title={t("dash.carryOverBalance")} hint={t("dash.monthByMonth")}>
          <BalanceArea data={m.balanceOverTime} gradientId={`panel-bal-${project.id}`} />
        </ChartCard>

        <ChartCard
          title={t("dash.profitByMonth")}
          hint={goal != null && goal > 0 ? <span className={styles.goalHint}><Target size={12} aria-hidden /> {t("dash.goalPerMonth", { value: fmt.money(goal) })}</span> : undefined}
        >
          <ProfitBars trend={m.trend} goal={goal} />
        </ChartCard>

        <ChartCard title={t("dash.expensesByCategory")} span="full" empty={!hasCategories} hint={hasCategories ? t("dash.largestFirst") : undefined}>
          <RankedBars items={m.topCategories} />
        </ChartCard>
      </div>
    </div>
  );
}
