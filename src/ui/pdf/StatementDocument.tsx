import { Document, Page, StyleSheet, Text, View, Svg, Rect, Line as SvgLine } from "@react-pdf/renderer";
import type { Statement } from "@core/export";
import type { Settings } from "@core/model/types";
import { formatNumber, formatPercent } from "@core/format/number";
import { cumulativeStatement, quarterlyStatement, shareOfIncome, normalizeStatementOptions, DEFAULT_STATEMENT_OPTIONS, STATEMENT_FORMATS, type StatementOptions } from "@core/export/statementFormats";
import { statementCopy, statementMonths } from "./statementCopy";
import { formatMoney } from "@core/format/money";
import { netColor } from "./pdfTheme";

export interface StatementDocumentProps { statement: Statement; settings: Settings; generatedAt: string; options?: StatementOptions; }
const ink = "#20242c", muted = "#697386", border = "#dfe3e8";
const colors = ["#168767", "#bd6b2f", "#5866bb"];
const styles = StyleSheet.create({
  page: { padding: 42, paddingBottom: 62, fontFamily: "Helvetica", fontSize: 10, color: ink },
  tag: { fontSize: 9, color: muted, marginBottom: 12 },
  title: { fontSize: 23, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 7 },
  meta: { fontSize: 9, color: muted, marginBottom: 26 },
  section: { fontSize: 11, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: border, paddingVertical: 8 },
  head: { backgroundColor: "#f0f2f5", fontWeight: 700 },
  cell: { flex: 1, textAlign: "right", paddingHorizontal: 7, fontSize: 9 },
  first: { flex: 1.6, textAlign: "left" },
  net: { backgroundColor: "#20242c", color: "#ffffff", marginTop: 12, paddingVertical: 16 },
  note: { fontSize: 8, color: muted, lineHeight: 1.5, marginTop: 18 },
  chart: { marginTop: 22, padding: 14, backgroundColor: "#f6f7f9", borderRadius: 7 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 10 },
  footer: { position: "absolute", bottom: 26, left: 42, right: 42, fontSize: 8, color: muted, flexDirection: "row", justifyContent: "space-between" },
});

/** Bars share a zero baseline, including losses, refunds and all-zero series. */
function Chart({ values, labels, series, title, wide = false }: { values: number[][]; labels: string[]; series: string[]; title: string; wide?: boolean }) {
  const width = wide ? 730 : 483, height = wide ? 55 : 105;
  const flat = values.flat();
  const min = Math.min(0, ...flat), max = Math.max(0, ...flat);
  const range = max - min || 1;
  const y = (v: number) => 8 + (max - v) / range * (height - 16);
  const inset = 38;
  const step = (width - inset) / Math.max(1, values.length);
  const bar = Math.min(26, step * .7 / series.length);
  return <View style={[styles.chart, ...(wide ? [{ marginTop: 12, paddingVertical: 10 }] : [])]} wrap={false}>
    <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 10 }}>{title}</Text>
    <View style={styles.legend}>{series.map((name, i) => <Text key={name} style={{ fontSize: 8, color: colors[i] }}>{name}</Text>)}</View>
    <Svg viewBox={`0 0 ${width} ${height + 18}`} style={{ width, height: height + 18 }}>
      <SvgLine x1={inset} x2={width} y1={y(0)} y2={y(0)} stroke="#aab2c0" strokeWidth={.6} />
      {[max, ...(min === max ? [] : [min])].map((v, i) => <Text key={i} x={inset - 5} y={y(v) + 2} textAnchor="end" style={{ fontSize: 6 }} fill={muted}>{new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)}</Text>)}
      {values.flatMap((group, i) => group.map((v, j) => <Rect key={`${i}-${j}`} x={inset + i * step + (step - bar * series.length) / 2 + j * bar} y={Math.min(y(v), y(0))} width={bar - 2} height={Math.abs(y(v) - y(0))} fill={colors[j]} />))}
      {labels.map((label, i) => <Text key={i} x={inset + (i + .5) * step} y={height + 12} textAnchor="middle" style={{ fontSize: 7 }} fill={muted}>{label}</Text>)}
    </Svg>
  </View>;
}

export function StatementDocument({ statement: s, settings, generatedAt, options = DEFAULT_STATEMENT_OPTIONS }: StatementDocumentProps) {
  const opts = normalizeStatementOptions(options);
  const c = statementCopy[settings.locale];
  const months = statementMonths(settings.locale), shortMonths = statementMonths(settings.locale, true);
  const num = (n: number) => formatNumber(n, settings.locale, settings.decimals);
  const money = (n: number) => formatMoney(n, settings);
  const pct = (n: number) => { const ratio = shareOfIncome(n, s.totals.entro); return ratio == null ? "N/A" : formatPercent(ratio, settings.locale, 1); };
  const labels = [c.income, c.expenses, c.result];
  const annual = [s.totals.entro, s.totals.salio, s.totals.teQueda];
  const row = (label: string, values: string[], kind: "normal" | "head" | "net" = "normal") => <View key={label} wrap={false} style={[styles.row, ...(kind === "head" ? [styles.head] : kind === "net" ? [styles.net] : [])]}>
    <Text style={[styles.cell, styles.first]}>{label}</Text>{values.map((v, i) => <Text key={i} style={styles.cell}>{v}</Text>)}
  </View>;
  return <Document title={`${c.title} · ${s.businessName} · ${s.year}`} author="Caja">
    {opts.formats.map((format) => {
      const cumulative = format === "cumulative";
      const series = cumulative ? cumulativeStatement(s, opts.throughMonth) : format === "quarterly" ? quarterlyStatement(s) : s.months;
      const wide = format === "monthly";
      return <Page key={format} size="A4" orientation={wide ? "landscape" : "portrait"} style={[styles.page, ...(wide ? [{ paddingTop: 30 }] : [])]}>
        <Text style={styles.tag}>{STATEMENT_FORMATS.indexOf(format) + 1} / 6 · {c.formats[format]}</Text>
        <Text style={[styles.title, ...(wide ? [{ fontSize: 18 }] : [])]}>{s.businessName}</Text>
        <Text style={styles.subtitle}>{c.title}</Text>
        <Text style={[styles.meta, ...(wide ? [{ marginBottom: 12 }] : [])]}>{cumulative ? `${months[0]}–${months[opts.throughMonth]}` : c.fullYear} {s.year} · {c.currency} {settings.currency}</Text>
        {(format === "simple" || format === "detailed") && <View>
          <Text style={styles.section}>{c.income}</Text>
          {row(c.recordedIncome, [num(annual[0])])}
          {format === "detailed" && row(`${c.total} · ${c.income}`, [num(annual[0])])}
          <Text style={styles.section}>{c.expenses}</Text>
          {row(c.recordedExpenses, [num(annual[1])])}
          {format === "detailed" && row(c.subtotal, [num(annual[2])])}
          {row(c.result, [num(annual[2])], "net")}
        </View>}
        {format === "commonSize" && <View>
          {row(c.concept, [c.amount, c.percent], "head")}
          {labels.map((label, i) => row(label, [num(annual[i]), pct(annual[i])], i === 2 ? "net" : "normal"))}
          {s.totals.entro === 0 && <Text style={styles.note}>{c.zeroNote}</Text>}
        </View>}
        {wide && <View>
          <View style={[styles.row, styles.head]}><Text style={[styles.cell, { flex: 1.25, textAlign: "left", fontSize: 8 }]}>{c.concept}</Text>{shortMonths.map((m) => <Text key={m} style={[styles.cell, { paddingHorizontal: 1, fontSize: 7 }]}>{m}</Text>)}<Text style={[styles.cell, { flex: 1.4, fontSize: 8 }]}>{c.total}</Text></View>
          {labels.map((label, i) => <View key={label} style={styles.row}><Text style={[styles.cell, { flex: 1.25, textAlign: "left", fontSize: 8 }]}>{label}</Text>{s.months.map((m) => <Text key={m.monthIndex} style={[styles.cell, { paddingHorizontal: 1, fontSize: 7 }]}>{num([m.entro, m.salio, m.saldo][i])}</Text>)}<Text style={[styles.cell, { flex: 1.4, fontSize: 8, fontWeight: 700 }]}>{num(annual[i])}</Text></View>)}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>{labels.map((label, i) => <View key={label} style={{ flex: 1, padding: 12, borderRadius: 7, backgroundColor: i === 2 ? ink : "#f0f2f5" }}><Text style={{ fontSize: 8, color: i === 2 ? "#dfe3e8" : muted, marginBottom: 6 }}>{label}</Text><Text style={{ fontSize: 16, fontWeight: 700, color: i === 2 ? "#ffffff" : ink }}>{money(annual[i])}</Text></View>)}</View>
          <Text style={{ fontSize: 8, color: muted, marginTop: 12 }}>{settings.locale === "es" ? "Mejor mes" : "Best month"}: {s.bestMonth == null ? "—" : months[s.bestMonth]} · {settings.locale === "es" ? "Mes más flojo" : "Weakest month"}: {s.worstMonth == null ? "—" : months[s.worstMonth]} · {settings.locale === "es" ? "Margen" : "Margin"}: {pct(s.totals.teQueda)} · {settings.locale === "es" ? "Promedio mensual" : "Monthly average"}: {money(s.monthlyAverage)}</Text>
          <Text style={{ fontSize: 8, color: netColor(s.totals.teQueda, settings.accent), marginTop: 5 }}>{s.positiveMonths} {settings.locale === "es" ? "meses en positivo" : "positive months"} · {s.negativeMonths} {settings.locale === "es" ? "meses en negativo" : "negative months"}</Text>
        </View>}
        {(format === "quarterly" || cumulative) && <View>
          {row(cumulative ? c.month : c.quarter, labels, "head")}
          {series.map((m) => row(cumulative ? months[m.monthIndex] : `${settings.locale === "es" ? "T" : "Q"}${m.monthIndex + 1} · ${shortMonths[m.monthIndex * 3]}–${shortMonths[m.monthIndex * 3 + 2]}`, [m.entro, m.salio, m.saldo].map(num)))}
          {!cumulative && row(c.total, annual.map(num), "net")}
        </View>}
        {opts.charts && <Chart wide={wide} title={cumulative ? c.cumulativeChart : c.chart} series={cumulative ? [c.result] : labels}
          values={cumulative ? series.map((m) => [m.saldo]) : ["monthly", "quarterly"].includes(format) ? series.map((m) => [m.entro, m.salio, m.saldo]) : [annual]}
          labels={cumulative ? series.map((m) => shortMonths[m.monthIndex]) : format === "monthly" ? shortMonths : format === "quarterly" ? [1, 2, 3, 4].map((q) => `${settings.locale === "es" ? "T" : "Q"}${q}`) : [c.summary]} />}
        <Text style={styles.note}>{cumulative ? `${c.cumulativeNote} ` : ""}{c.note}</Text>
        <View style={styles.footer} fixed><Text>{c.generated} · {generatedAt}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>;
    })}
  </Document>;
}
