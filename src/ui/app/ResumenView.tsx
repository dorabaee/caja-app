import { useMemo, useState, type CSSProperties } from "react";
import { Share2, Search, ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UNCATEGORIZED, monthlyExpenseCategories, yearlyResumen } from "@core/compute";
import type { CategoryGroup } from "@core/model/types";
import { useUI } from "@core/store";
import { Button, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { useChartColors } from "@ui/hooks/useChartColors";
import styles from "./ResumenView.module.css";

/**
 * What the "Gastos por categoría" list is keyed on:
 * - "category": the project's real categories, everything else folded into "Sin categoría";
 * - "amount" / "name": every distinct description value, ordered by total or alphabetically.
 * Picking a category writes it into the description cell, so the two views are the same
 * column read two ways — which is why the mode also decides the grouping, not just the sort.
 */
type CatMode = "category" | "amount" | "name";

const MODE_KEY: Record<CatMode, string> = {
  category: "dash.groupCategory",
  amount: "dash.sortAmount",
  name: "dash.sortName",
};

/** Which half of the chart of accounts the list is showing. */
type GroupFilter = "all" | CategoryGroup;

const GROUP_KEY: Record<GroupFilter, string> = {
  all: "dash.groupAll",
  fiscal: "widgets.group_fiscal",
  noFiscal: "widgets.group_noFiscal",
};

export function ResumenView() {
  const { t } = useTranslation();
  const monthLabels = useMonths();
  const project = useCurrentProject();
  const fmt = useFormat();
  const colors = useChartColors();
  const openModal = useUI((s) => s.openModal);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<CatMode>("category");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [descending, setDescending] = useState(true);
  const [distinct, setDistinct] = useState(true);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const catRows = useMemo(
    () =>
      project
        ? monthlyExpenseCategories(project, {
            // Splitting fiscal from no fiscal is a question about categories, so asking
            // it groups by category too, whatever the sort control says.
            byCategory: mode === "category" || group !== "all",
            group: group === "all" ? undefined : group,
          })
        : [],
    [project, mode, group],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dir = descending ? 1 : -1;
    return catRows
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .sort((a, b) =>
        mode === "name" ? a.label.localeCompare(b.label) * dir : (b.total - a.total) * dir,
      );
  }, [catRows, search, mode, descending]);

  if (!project) return null;
  const { months, totals } = yearlyResumen(project);

  const toggle = (label: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  // Months (with expense activity) → the filtered categories that have a value that
  // month. Selecting chips narrows this too: highlighting alone left the month lists
  // unchanged, so picking a category told you nothing you couldn't already see.
  const monthGroups = months
    .map((m) => ({
      monthIndex: m.monthIndex,
      cats: filtered
        .filter((c) => selected.size === 0 || selected.has(c.label))
        .map((c) => ({ label: c.label, value: c.byMonth[m.monthIndex] }))
        .filter((c) => c.value !== 0),
    }))
    .filter((g) => g.cats.length > 0);

  return (
    <div className={styles.wrap}>
      {/* No KPI cards here: the year table below ends with the very same three
          figures, so the hero only said everything twice. MonthView keeps its own. */}
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
          <div className={styles.tabs} role="group" aria-label={t("dash.bookHalf")}>
            {(["all", "fiscal", "noFiscal"] as GroupFilter[]).map((g) => (
              <button
                key={g}
                type="button"
                className={cn(styles.tab, group === g && styles.tabOn)}
                aria-pressed={group === g}
                onClick={() => {
                  setGroup(g);
                  setSelected(new Set());
                }}
              >
                {t(GROUP_KEY[g])}
              </button>
            ))}
          </div>
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
            <div className={styles.segmented} role="group" aria-label={t("dash.groupBy")}>
              {(["category", "amount", "name"] as CatMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(styles.segBtn, mode === m && styles.segOn)}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {t(MODE_KEY[m])}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.sortDir}
              aria-label={descending ? t("dash.sortDesc") : t("dash.sortAsc")}
              title={descending ? t("dash.sortDesc") : t("dash.sortAsc")}
              onClick={() => setDescending((d) => !d)}
            >
              {descending ? <ArrowDown size={15} aria-hidden /> : <ArrowUp size={15} aria-hidden />}
            </button>
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
                const on = selected.has(c.label);
                const none = c.label === UNCATEGORIZED;
                return (
                  <button
                    key={c.label}
                    type="button"
                    // The color rides on a custom property so hover, selection and the
                    // dark theme are all expressed in CSS instead of two inline styles.
                    className={cn(styles.chip, on && styles.chipOn, none && styles.chipNone)}
                    style={{ "--cat-color": colors.categoryColor(c.label, distinct) } as CSSProperties}
                    aria-pressed={on}
                    onClick={() => toggle(c.label)}
                  >
                    <span className={styles.chipMark} aria-hidden>
                      {/* A check, not just a color: selection has to read without it. */}
                      {on ? <Check size={11} strokeWidth={3} /> : <span className={styles.chipDot} />}
                    </span>
                    <span className={styles.chipName}>{c.label}</span>
                    <span className={cn(styles.chipVal, "tnum")}>{fmt.moneyPlain(c.total)}</span>
                  </button>
                );
              })}
              {selected.size > 0 && (
                <button type="button" className={styles.chipClear} onClick={() => setSelected(new Set())}>
                  <X size={12} aria-hidden />
                  {t("dash.showAll")}
                </button>
              )}
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
                    const on = selected.has(c.label);
                    const none = c.label === UNCATEGORIZED;
                    return (
                      <div
                        key={c.label}
                        className={cn(styles.catSubRow, on && styles.catSubRowOn, none && styles.catSubRowNone)}
                        style={{ "--cat-color": colors.categoryColor(c.label, distinct) } as CSSProperties}
                      >
                        <span className={styles.chipDot} aria-hidden />
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
