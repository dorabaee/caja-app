import { useMemo, useState } from "react";
import { Share2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { monthlyExpenseCategories, yearlyResumen } from "@core/compute";
import { useUI } from "@core/store";
import { Button, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { useChartColors } from "@ui/hooks/useChartColors";
import { KpiHero } from "./KpiHero";
import styles from "./ResumenView.module.css";

type SortMode = "amount" | "name";

export function ResumenView() {
  const { t } = useTranslation();
  const monthLabels = useMonths();
  const project = useCurrentProject();
  const fmt = useFormat();
  const colors = useChartColors();
  const openModal = useUI((s) => s.openModal);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("amount");
  const [distinct, setDistinct] = useState(true);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const catRows = useMemo(() => (project ? monthlyExpenseCategories(project) : []), [project]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catRows
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .sort((a, b) => (sortMode === "name" ? a.label.localeCompare(b.label) : b.total - a.total));
  }, [catRows, search, sortMode]);

  if (!project) return null;
  const { months, totals } = yearlyResumen(project);

  const toggle = (label: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  // Months (with expense activity) → the filtered categories that have a value that month.
  const monthGroups = months
    .map((m) => ({
      monthIndex: m.monthIndex,
      cats: filtered
        .map((c) => ({ label: c.label, value: c.byMonth[m.monthIndex] }))
        .filter((c) => c.value !== 0),
    }))
    .filter((g) => g.cats.length > 0);

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

      {/* #16 — expenses by category: search / sort / highlight */}
      <div className={styles.catCard}>
        <div className={styles.catHead}>
          <h3 className={styles.catTitle}>{t("dash.categoriesTitle")}</h3>
          <div className={styles.catControls}>
            <span className={styles.searchBox}>
              <Search size={14} aria-hidden />
              <input
                className={styles.searchInput}
                value={search}
                placeholder={t("dash.searchCategory")}
                aria-label={t("dash.searchCategory")}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
            <div className={styles.segmented} role="group" aria-label={t("dash.sortBy")}>
              <button
                type="button"
                className={cn(styles.segBtn, sortMode === "amount" && styles.segOn)}
                onClick={() => setSortMode("amount")}
              >
                {t("dash.sortAmount")}
              </button>
              <button
                type="button"
                className={cn(styles.segBtn, sortMode === "name" && styles.segOn)}
                onClick={() => setSortMode("name")}
              >
                {t("dash.sortName")}
              </button>
            </div>
            <button
              type="button"
              className={styles.colorToggle}
              onClick={() => setDistinct((d) => !d)}
              title={distinct ? t("dash.colorDistinct") : t("dash.colorMono")}
            >
              <span className={styles.colorSwatch} data-mode={distinct ? "distinct" : "mono"} aria-hidden />
              {distinct ? t("dash.colorDistinct") : t("dash.colorMono")}
            </button>
          </div>
        </div>

        {catRows.length === 0 ? (
          <p className={styles.catEmpty}>{t("dash.noExpenseCategories")}</p>
        ) : filtered.length === 0 ? (
          <p className={styles.catEmpty}>{t("dash.noCategoryMatch")}</p>
        ) : (
          <>
            <div className={styles.chips}>
              {filtered.map((c) => {
                const color = colors.categoryColor(c.label, distinct);
                const on = selected.has(c.label);
                return (
                  <button
                    key={c.label}
                    type="button"
                    className={cn(styles.chip, on && styles.chipOn)}
                    style={on ? { borderColor: color, background: `${color}22` } : undefined}
                    aria-pressed={on}
                    onClick={() => toggle(c.label)}
                  >
                    <span className={styles.chipDot} style={{ background: color }} aria-hidden />
                    <span className={styles.chipName}>{c.label}</span>
                    <span className={cn(styles.chipVal, "tnum")}>{fmt.moneyPlain(c.total)}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.breakdown}>
              {monthGroups.map((g) => (
                <div key={g.monthIndex} className={styles.monthGroup}>
                  <div className={styles.monthGroupHead}>
                    <span>{monthLabels.full[g.monthIndex]}</span>
                    <span className={cn(styles.monthGroupTotal, "tnum")}>
                      {fmt.moneyPlain(g.cats.reduce((s, c) => s + c.value, 0))}
                    </span>
                  </div>
                  {g.cats.map((c) => {
                    const color = colors.categoryColor(c.label, distinct);
                    const on = selected.has(c.label);
                    return (
                      <div
                        key={c.label}
                        className={cn(styles.catSubRow, on && styles.catSubRowOn)}
                        style={on ? { background: `${color}1f`, boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                      >
                        <span className={styles.chipDot} style={{ background: color }} aria-hidden />
                        <span className={styles.catSubName}>{c.label}</span>
                        <span className={cn(styles.catSubVal, "tnum")}>{fmt.moneyPlain(c.value)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="primary" icon={<Share2 />} onClick={() => openModal("share")}>
          {t("dash.shareSummary")}
        </Button>
      </div>
    </div>
  );
}
