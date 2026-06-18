import { type ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useFormat } from "@ui/hooks/useFormat";
import { useMonths } from "@ui/hooks/useMonths";
import { useChartColors } from "@ui/hooks/useChartColors";
import styles from "./miniChart.module.css";

/** Short axis labels: 3,000 → "3k", 1,250,000 → "1.25M". */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Card shell shared by every dashboard chart — title + fixed-height plot, no header/drag. */
export function ChartCard({
  title,
  hint,
  children,
  span,
  tall,
  empty,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  /** Grid span: "full" stretches both columns. */
  span?: "full";
  /** Taller plot (for the wide 12-month charts). */
  tall?: boolean;
  /** When true, render an empty placeholder instead of the chart. */
  empty?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className={span === "full" ? styles.cardFull : styles.card}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {hint && <span className={styles.cardHint}>{hint}</span>}
      </header>
      <div className={tall ? styles.plotTall : styles.plot}>
        {empty ? <p className={styles.emptyPlot}>{t("dash.noDataYet")}</p> : children}
      </div>
    </section>
  );
}

/** Themed recharts <Tooltip> bound to the current theme + currency formatting. */
function useTooltip() {
  const fmt = useFormat();
  const colors = useChartColors();
  return { fmt, colors };
}

function tooltipProps(colors: ReturnType<typeof useChartColors>) {
  return {
    contentStyle: {
      background: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 10,
      boxShadow: "var(--shadow-pop)",
      fontSize: 12,
      padding: "8px 10px",
    },
    labelStyle: { color: colors.tooltipText, fontWeight: 600, marginBottom: 2 },
    itemStyle: { color: colors.tooltipText },
  } as const;
}

const TICK = { fontSize: 11, fontFamily: "var(--font-num)" } as const;

/** Grouped Entró / Salió bars across the 12 months. */
export function TrendBars({
  trend,
}: {
  trend: { monthIndex: number; entro: number; salio: number }[];
}) {
  const { t } = useTranslation();
  const months = useMonths();
  const { fmt, colors } = useTooltip();
  const data = trend.map((row) => ({ name: months.short[row.monthIndex], entro: row.entro, salio: row.salio }));
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={{ stroke: colors.grid }} interval={0} />
        <YAxis tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
        <Tooltip cursor={{ fill: colors.grid, fillOpacity: 0.4 }} {...tooltipProps(colors)} formatter={(v, n) => [fmt.money(Number(v ?? 0)), n === "entro" ? t("dash.seriesIn") : t("dash.seriesOut")]} />
        <Bar dataKey="entro" name={t("dash.seriesIn")} fill={colors.income} radius={[3, 3, 0, 0]} isAnimationActive={!colors.reduceMotion} />
        <Bar dataKey="salio" name={t("dash.seriesOut")} fill={colors.expense} radius={[3, 3, 0, 0]} isAnimationActive={!colors.reduceMotion} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Monthly net profit bars (coloured by sign) with an optional dashed goal line. */
export function ProfitBars({
  trend,
  goal,
}: {
  trend: { monthIndex: number; entro: number; salio: number }[];
  goal?: number;
}) {
  const { t } = useTranslation();
  const months = useMonths();
  const { fmt, colors } = useTooltip();
  const data = trend.map((row) => ({ name: months.short[row.monthIndex], profit: row.entro - row.salio }));
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={{ stroke: colors.grid }} interval={0} />
        <YAxis tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
        <Tooltip cursor={{ fill: colors.grid, fillOpacity: 0.4 }} {...tooltipProps(colors)} formatter={(v) => [fmt.money(Number(v ?? 0)), t("dash.seriesProfit")]} />
        {goal != null && goal > 0 && (
          <ReferenceLine
            y={goal}
            ifOverflow="extendDomain"
            stroke={colors.accentStrong}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: t("dash.goalShort", { value: compact(goal) }), position: "insideTopRight", fill: colors.accentStrong, fontSize: 10, fontFamily: "var(--font-num)" }}
          />
        )}
        <Bar dataKey="profit" name={t("dash.seriesProfit")} radius={[3, 3, 0, 0]} isAnimationActive={!colors.reduceMotion}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.profit >= 0 ? colors.income : colors.expense} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Gradient-fill area of a running balance across the year. */
export function BalanceArea({
  data,
  gradientId,
}: {
  data: { monthIndex: number; balance: number }[];
  gradientId: string;
}) {
  const { t } = useTranslation();
  const months = useMonths();
  const { fmt, colors } = useTooltip();
  const points = data.map((d) => ({ name: months.short[d.monthIndex], balance: d.balance }));
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.32} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={{ stroke: colors.grid }} interval={1} />
        <YAxis tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
        <Tooltip cursor={{ stroke: colors.grid }} {...tooltipProps(colors)} formatter={(v) => [fmt.money(Number(v ?? 0)), t("dash.seriesBalance")]} />
        <Area type="monotone" dataKey="balance" name={t("dash.seriesBalance")} stroke={colors.accent} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={!colors.reduceMotion} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for labelled values (top expense categories, per-business saldo, …). */
export function RankedBars({
  items,
  signed,
}: {
  items: { label: string; value: number }[];
  /** When true, colour bars by sign (income/expense); else use the chart palette. */
  signed?: boolean;
}) {
  const { t } = useTranslation();
  const { fmt, colors } = useTooltip();
  const data = items.map((it) => ({ name: it.label, value: it.value }));
  // Width scales with label length so names aren't clipped.
  const labelWidth = Math.min(140, Math.max(64, ...data.map((d) => d.name.length * 7)));
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap="26%">
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis type="number" tick={{ ...TICK, fill: colors.axis }} tickLine={false} axisLine={false} tickFormatter={compact} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: colors.axis }} tickLine={false} axisLine={false} width={labelWidth} />
        <Tooltip cursor={{ fill: colors.grid, fillOpacity: 0.4 }} {...tooltipProps(colors)} formatter={(v) => [fmt.money(Number(v ?? 0)), t("dash.seriesAmount")]} />
        <Bar dataKey="value" name={t("dash.seriesAmount")} radius={[0, 4, 4, 0]} isAnimationActive={!colors.reduceMotion} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={signed ? (d.value >= 0 ? colors.income : colors.expense) : colors.barColor(i)} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => fmt.number(Number(v ?? 0))}
            style={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-num)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
