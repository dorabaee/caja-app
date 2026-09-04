import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Scale, Percent, Layers, Info, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { allBusinessesMetrics } from "@core/compute";
import { useStore } from "@core/store";
import { useFormat } from "@ui/hooks/useFormat";
import { Button, Popover, Switch } from "@ui/common";
import { StatCard } from "@ui/widgets/StatCard";
import { ChartCard, TrendBars, BalanceArea, RankedBars } from "@ui/widgets/MiniChart";
import styles from "./AllBusinesses.module.css";

export function AllBusinessesView() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const fmt = useFormat();
  // `null` deliberately means every business: a new business is automatically included
  // until the person viewing the overview chooses a narrower selection.
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const visibleProjects = useMemo(
    () => selectedIds === null ? projects : projects.filter((project) => selectedIds.has(project.id)),
    [projects, selectedIds],
  );

  const m = allBusinessesMetrics(visibleProjects);
  const active = m.totals.entro !== 0 || m.totals.salio !== 0;
  const comparison = m.businesses
    .map((b) => ({ label: b.name, value: b.totals.teQueda }))
    .sort((a, b) => b.value - a.value);
  const hasCategories = m.topCategories.length > 0;

  const toggleProject = (id: string) => {
    const next = new Set(selectedIds ?? projects.map((project) => project.id));
    if (next.has(id)) {
      // Keep at least one business selected: an empty overview is not a useful state.
      if (next.size === 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next.size === projects.length ? null : next);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.lead}>
        <div className={styles.leadTitle}>
          <Layers size={18} aria-hidden />
          <h1>{t("dash.allBusinesses")}</h1>
        </div>
        <div className={styles.leadActions}>
          <span className={styles.currencyNote}>
            <Info size={13} aria-hidden />
            {t("dash.businessesNote", { count: m.businesses.length, currency: fmt.currency })}
          </span>
          <Popover
            align="end"
            minWidth={260}
            className={styles.businessPicker}
            trigger={
              <Button variant="secondary" size="sm" icon={<SlidersHorizontal size={15} />}>
                {selectedIds === null ? t("dash.showAllBusinesses") : t("dash.businessesSelected", { count: visibleProjects.length })}
              </Button>
            }
          >
            <div className={styles.pickerHeader}>
              <strong>{t("dash.filterBusinesses")}</strong>
              <button type="button" className={styles.showAllButton} onClick={() => setSelectedIds(null)}>
                {t("dash.showAll")}
              </button>
            </div>
            <p className={styles.pickerHint}>{t("dash.filterBusinessesHint")}</p>
            <div className={styles.businessOptions}>
              {projects.map((project) => {
                const checked = selectedIds === null || selectedIds.has(project.id);
                const onlySelection = checked && selectedIds !== null && selectedIds.size === 1;
                return (
                  <label key={project.id} className={styles.businessOption}>
                    <span>{project.name}</span>
                    <Switch
                      checked={checked}
                      disabled={onlySelection}
                      aria-label={t("dash.toggleBusiness", { name: project.name })}
                      onChange={() => toggleProject(project.id)}
                    />
                  </label>
                );
              })}
            </div>
          </Popover>
        </div>
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
