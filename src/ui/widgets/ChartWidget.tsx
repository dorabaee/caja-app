import { memo, useEffect, useMemo, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  GripVertical,
  MoreHorizontal,
  ChevronDown,
  Link2,
  Trash2,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  PieChart as PieIcon,
} from "lucide-react";
import type { Chart, ChartType, Table } from "@core/model/types";
import { chartLabelColumn, chartSeries, chartValueColumn } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, Button, cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import { useChartColors } from "@ui/hooks/useChartColors";
import { DRAG_HANDLE } from "./dragHandle";
import wstyles from "./widget.module.css";
import styles from "./chart.module.css";

const TYPE_KEY: Record<ChartType, string> = {
  bar: "widgets.chartBar",
  line: "widgets.chartLine",
  area: "widgets.chartArea",
  pie: "widgets.chartPie",
};
const TYPE_ICON: Record<ChartType, ReactElement> = {
  bar: <BarChart3 size={14} />,
  line: <LineIcon size={14} />,
  area: <AreaIcon size={14} />,
  pie: <PieIcon size={14} />,
};

/** Short axis labels: 3,000 → "3k", 1,250,000 → "1.25M". */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export const ChartWidget = memo(function ChartWidget({
  monthIndex,
  chart,
  tables,
  fill,
}: {
  monthIndex: number;
  chart: Chart;
  tables: Table[];
  fill?: boolean;
}) {
  const { t } = useTranslation();
  const s = useStore.getState;
  const fmt = useFormat();
  const colors = useChartColors();
  const select = useUI((u) => u.select);
  const selected = useUI((u) => u.selectedWidgetId === chart.id);

  const linked = tables.find((t) => t.id === chart.linkedTableId) ?? null;

  const [title, setTitle] = useState(chart.title);
  useEffect(() => setTitle(chart.title), [chart.title]);
  const commitTitle = () => {
    const next = title.trim() || t("widgets.chartDefaultTitle");
    if (next !== chart.title) s().updateChart(monthIndex, chart.id, { title: next });
    setTitle(next);
  };

  const data = useMemo(
    () =>
      linked
        ? chartSeries(linked, {
            xColumnId: chart.xColumnId,
            valueColumnId: chart.valueColumnId,
            aggregate: chart.type === "pie",
          })
        : [],
    [linked, chart.xColumnId, chart.valueColumnId, chart.type],
  );

  const valueName = linked
    ? chartValueColumn(linked, chart.valueColumnId)?.name ?? t("widgets.value")
    : t("widgets.value");
  const labelColId = linked ? chartLabelColumn(linked, chart.xColumnId)?.id : undefined;
  const valueColId = linked ? chartValueColumn(linked, chart.valueColumnId)?.id : undefined;
  const labelCols = linked?.columns.filter((c) => c.type === "text" || c.type === "date") ?? [];
  const moneyCols = linked?.columns.filter((c) => c.type === "money") ?? [];

  const hasData = data.some((d) => d.value !== 0);
  const anim = !colors.reduceMotion;

  const tooltip = (
    <Tooltip
      cursor={chart.type === "bar" ? { fill: colors.grid, fillOpacity: 0.45 } : { stroke: colors.grid }}
      contentStyle={{
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 10,
        boxShadow: "var(--shadow-pop)",
        fontSize: 12,
        padding: "8px 10px",
      }}
      labelStyle={{ color: colors.tooltipText, fontWeight: 600, marginBottom: 2 }}
      itemStyle={{ color: colors.tooltipText }}
      formatter={(value) => [fmt.money(Number(value ?? 0)), valueName]}
    />
  );

  const axisX = (
    <XAxis
      dataKey="name"
      tick={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-num)" }}
      tickLine={false}
      axisLine={{ stroke: colors.grid }}
      interval="preserveStartEnd"
      minTickGap={12}
    />
  );
  const axisY = (
    <YAxis
      tick={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-num)" }}
      tickLine={false}
      axisLine={false}
      width={40}
      tickFormatter={compact}
    />
  );
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />;
  const margin = { top: 8, right: 12, bottom: 4, left: 0 };

  function renderChart() {
    switch (chart.type) {
      case "line":
        return (
          <LineChart data={data} margin={margin}>
            {grid}
            {axisX}
            {axisY}
            {tooltip}
            <Line
              type="monotone"
              dataKey="value"
              name={valueName}
              stroke={colors.accent}
              strokeWidth={2}
              dot={{ r: 2.5, fill: colors.accent, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={anim}
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data} margin={margin}>
            <defs>
              <linearGradient id={`caja-grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.34} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            {axisX}
            {axisY}
            {tooltip}
            <Area
              type="monotone"
              dataKey="value"
              name={valueName}
              stroke={colors.accent}
              strokeWidth={2}
              fill={`url(#caja-grad-${chart.id})`}
              isAnimationActive={anim}
            />
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            {tooltip}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="56%"
              outerRadius="82%"
              paddingAngle={1.5}
              stroke={colors.tooltipBg}
              strokeWidth={1.5}
              isAnimationActive={anim}
            >
              {colors.sliceColors(data.length).map((c, i) => (
                <Cell key={i} fill={c} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={24}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: colors.axis }}
            />
          </PieChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={data} margin={margin}>
            {grid}
            {axisX}
            {axisY}
            {tooltip}
            <Bar dataKey="value" name={valueName} radius={[4, 4, 0, 0]} isAnimationActive={anim}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors.barColor(i)} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  }

  // Menu listing every table in the month (link picker). Shared by header ⋯ and empty state.
  const tablePickerItems =
    tables.length > 0 ? (
      tables.map((t) => (
        <MenuItem
          key={t.id}
          checked={t.id === chart.linkedTableId}
          onClick={() => s().updateChart(monthIndex, chart.id, { linkedTableId: t.id })}
        >
          {t.title}
        </MenuItem>
      ))
    ) : (
      <MenuItem disabled>{t("widgets.noTablesThisMonth")}</MenuItem>
    );

  return (
    <div
      className={cn(wstyles.card, fill && wstyles.cardFill, selected && wstyles.selected)}
      onMouseDown={() => select(chart.id)}
    >
      <div className={wstyles.whead}>
        <span className={cn(wstyles.handle, DRAG_HANDLE)} title={t("widgets.move")} aria-hidden>
          <GripVertical size={16} />
        </span>
        <input
          className={wstyles.titleInput}
          value={title}
          aria-label={t("widgets.chartTitle")}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setTitle(chart.title);
          }}
        />

        <Menu
          align="end"
          trigger={
            <button type="button" className={wstyles.kindBtn}>
              {TYPE_ICON[chart.type]}
              {t(TYPE_KEY[chart.type])}
              <ChevronDown size={14} className={wstyles.kindCaret} aria-hidden />
            </button>
          }
        >
          {(["bar", "line", "area", "pie"] as ChartType[]).map((ct) => (
            <MenuItem
              key={ct}
              icon={TYPE_ICON[ct]}
              checked={chart.type === ct}
              onClick={() => s().updateChart(monthIndex, chart.id, { type: ct })}
            >
              {t(TYPE_KEY[ct])}
            </MenuItem>
          ))}
        </Menu>

        <Menu
          align="end"
          trigger={<IconButton label={t("widgets.chartOptions")} icon={<MoreHorizontal />} size="sm" />}
        >
          <MenuLabel>{t("widgets.linkTable")}</MenuLabel>
          {tablePickerItems}
          {linked && labelCols.length > 1 && (
            <>
              <MenuLabel>{t("widgets.axisX")}</MenuLabel>
              {labelCols.map((c) => (
                <MenuItem
                  key={c.id}
                  checked={c.id === labelColId}
                  onClick={() => s().updateChart(monthIndex, chart.id, { xColumnId: c.id })}
                >
                  {c.name}
                </MenuItem>
              ))}
            </>
          )}
          {linked && moneyCols.length > 1 && (
            <>
              <MenuLabel>{t("widgets.value")}</MenuLabel>
              {moneyCols.map((c) => (
                <MenuItem
                  key={c.id}
                  checked={c.id === valueColId}
                  onClick={() => s().updateChart(monthIndex, chart.id, { valueColumnId: c.id })}
                >
                  {c.name}
                </MenuItem>
              ))}
            </>
          )}
          <MenuSeparator />
          <MenuItem icon={<Trash2 />} danger onClick={() => s().removeChart(monthIndex, chart.id)}>
            {t("widgets.deleteChart")}
          </MenuItem>
        </Menu>
      </div>

      <div className={styles.subhead}>
        {linked ? (
          <span className={styles.linkedPill}>
            <BarChart3 size={13} aria-hidden />
            <span>{linked.title}</span>
          </span>
        ) : (
          <span className={styles.unlinked}>{t("widgets.noLinkedTable")}</span>
        )}
      </div>

      <div className={cn(styles.body, !fill && styles.bodyList)}>
        {linked && hasData ? (
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              {renderChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <BarChart3 size={30} strokeWidth={1.5} />
            </span>
            <p className={styles.emptyText}>
              {!linked
                ? t("widgets.emptyNoLink")
                : t("widgets.emptyNoData")}
            </p>
            {!linked && (
              <Menu
                trigger={
                  <Button variant="primary" size="sm" icon={<Link2 />}>
                    {t("widgets.chooseTable")}
                  </Button>
                }
              >
                <MenuLabel>{t("widgets.linkTable")}</MenuLabel>
                {tablePickerItems}
              </Menu>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
