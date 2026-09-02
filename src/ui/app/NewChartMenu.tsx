import { useMemo, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { ChartType, Table } from "@core/model/types";
import { uniqueTableLabels } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { Button, Popover, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { ChartTypePreview } from "./ChartTypePreview";
import styles from "./NewChartMenu.module.css";

const TYPES: { key: ChartType; labelKey: string; aboutKey: string }[] = [
  { key: "bar", labelKey: "widgets.chartBar", aboutKey: "month.aboutBar" },
  { key: "stacked", labelKey: "widgets.chartStacked", aboutKey: "month.aboutStacked" },
  { key: "line", labelKey: "widgets.chartLine", aboutKey: "month.aboutLine" },
  { key: "area", labelKey: "widgets.chartArea", aboutKey: "month.aboutArea" },
  { key: "combo", labelKey: "widgets.chartCombo", aboutKey: "month.aboutCombo" },
  { key: "pie", labelKey: "widgets.chartPie", aboutKey: "month.aboutPie" },
];

/**
 * Creating a chart used to happen on the toolbar button's click, with no visible result
 * unless you happened to be looking at the right patch of canvas — so the button read as
 * broken and got clicked repeatedly, leaving a pile of blank charts.
 *
 * Two screens now: pick the shape from a scrolling gallery of animated previews, then
 * step right into the table picker. Nothing is created until "Crear gráfica".
 */
export function NewChartMenu({ trigger }: { trigger: ReactElement }) {
  const { t } = useTranslation();
  const project = useCurrentProject();
  const monthIndex = useUI((s) => s.monthIndex);
  const select = useUI((s) => s.select);

  const tables: Table[] = project?.months[monthIndex]?.tables ?? [];
  const labels = useMemo(() => uniqueTableLabels(tables), [tables]);

  const [screen, setScreen] = useState<"type" | "tables">("type");
  const [type, setType] = useState<ChartType>("bar");
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const typeLabel = t(TYPES.find((x) => x.key === type)?.labelKey ?? "widgets.chartBar");

  return (
    <Popover
      align="end"
      minWidth={340}
      className={styles.pop}
      onOpenChange={(open) => {
        // Reopening starts fresh rather than resuming a half-made chart.
        if (open) {
          setScreen("type");
          setType("bar");
          setPicked(new Set());
        }
      }}
      trigger={trigger}
    >
      {({ close }) => (
        <div
          className={styles.panel}
          onKeyDown={(e) => {
            // Backspace mirrors the back arrow, as long as focus isn't in a field.
            if (e.key === "Backspace" && screen === "tables") {
              e.preventDefault();
              setScreen("type");
            }
          }}
        >
          {tables.length === 0 ? (
            <p className={styles.empty}>{t("month.chartNeedsTable")}</p>
          ) : screen === "type" ? (
            <div className={styles.screen} key="type">
              <p className={styles.label}>{t("month.chartType")}</p>
              <div className={styles.gallery}>
                {TYPES.map((ct) => {
                  const on = type === ct.key;
                  return (
                    <button
                      key={ct.key}
                      type="button"
                      className={cn(styles.typeRow, on && styles.typeRowOn)}
                      aria-pressed={on}
                      onClick={() => setType(ct.key)}
                    >
                      <ChartTypePreview type={ct.key} />
                      <span className={styles.typeText}>
                        <span className={styles.typeName}>{t(ct.labelKey)}</span>
                        <span className={styles.typeAbout}>{t(ct.aboutKey)}</span>
                      </span>
                      {on && (
                        <span className={styles.typeCheck} aria-hidden>
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className={styles.foot}>
                <span className={styles.count}>{typeLabel}</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setScreen("tables")}
                >
                  {t("month.chooseTablesNext")}
                  <ChevronRight size={15} aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.screen} key="tables">
              <div className={styles.head}>
                <button
                  type="button"
                  className={styles.back}
                  aria-label={t("common.back")}
                  onClick={() => setScreen("type")}
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <p className={styles.headTitle}>{t("widgets.linkTables")}</p>
                <span className={styles.headMeta}>{typeLabel}</span>
              </div>

              <div className={styles.tables}>
                {tables.map((tbl) => {
                  const on = picked.has(tbl.id);
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      className={cn(styles.tableRow, on && styles.tableRowOn)}
                      aria-pressed={on}
                      onClick={() => toggle(tbl.id)}
                    >
                      <span className={cn(styles.check, on && styles.checkOn)} aria-hidden>
                        {on && <Check size={12} />}
                      </span>
                      <span className={styles.tableName}>{labels[tbl.id] ?? tbl.title}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.foot}>
                <span className={styles.count}>
                  {picked.size === 0
                    ? t("month.chartWillBeEmpty")
                    : t("month.chartLinked", { count: picked.size })}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<BarChart3 />}
                  onClick={() => {
                    const id = useStore.getState().addChart(monthIndex, [...picked]);
                    useStore.getState().updateChart(monthIndex, id, { type });
                    select(id);
                    useUI.getState().toast(t("month.chartCreated"), "success");
                    close();
                  }}
                >
                  {t("month.createChart")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}
