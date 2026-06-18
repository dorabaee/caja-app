import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Statement } from "@core/export";
import type { Settings } from "@core/model/types";
import { formatMoney } from "@core/format/money";
import { formatNumber, formatPercent } from "@core/format/number";
import { MONTHS_FULL_ES, MONTHS_SHORT_ES } from "@ui/util/months";
import {
  PDF_BORDER,
  PDF_BORDER_STRONG,
  PDF_INK,
  PDF_INK_SOFT,
  PDF_MUTED,
  PDF_SUBTLE,
  PDF_SURFACE_2,
  netColor,
} from "./pdfTheme";

export interface StatementDocumentProps {
  statement: Statement;
  settings: Settings;
  /** Pre-formatted "dd/M/yyyy" so the component stays free of `new Date()`. */
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 60,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: PDF_INK,
  },
  pageWide: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PDF_INK,
  },
  tag: { textAlign: "right", color: PDF_SUBTLE, fontSize: 9 },

  titleBlock: { alignItems: "center", marginTop: 18, marginBottom: 26 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  subtitle: { fontSize: 12, marginBottom: 3 },
  dateRange: { fontSize: 9.5, color: PDF_MUTED },

  body: { width: 460, alignSelf: "center" },
  section: { marginTop: 16, marginBottom: 1, fontSize: 11, color: PDF_MUTED },

  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_BORDER,
  },
  lineLabel: { fontSize: 10.5 },
  lineValue: { fontSize: 10.5 },
  bold: { fontFamily: "Helvetica-Bold" },

  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: PDF_INK,
  },
  netLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  netValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },

  note: { marginTop: 18, fontSize: 8.5, color: PDF_SUBTLE, lineHeight: 1.4 },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: "center",
    color: PDF_SUBTLE,
    fontSize: 8,
  },

  // Format 3
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  topTitle: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  topSub: { fontSize: 9.5, color: PDF_MUTED, marginTop: 3 },
  topRightTag: { fontSize: 9, color: PDF_SUBTLE, marginBottom: 3 },

  tHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_BORDER_STRONG,
    paddingBottom: 5,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_BORDER,
  },
  tConcept: { width: 56, fontSize: 8.5 },
  tConceptHead: { width: 56, fontSize: 8, color: PDF_MUTED },
  tMonth: { flex: 1, fontSize: 7.5, textAlign: "right" },
  tMonthHead: { flex: 1, fontSize: 8, textAlign: "right", color: PDF_MUTED },
  tTotal: { width: 56, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" },
  tTotalHead: { width: 56, fontSize: 8, textAlign: "right", color: PDF_MUTED, fontFamily: "Helvetica-Bold" },

  cards: { flexDirection: "row", marginTop: 22 },
  card: { flex: 1, backgroundColor: PDF_SURFACE_2, borderRadius: 8, padding: 14 },
  cardLabel: { fontSize: 9, color: PDF_MUTED, marginBottom: 6 },
  cardValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  cardDark: { backgroundColor: PDF_INK_SOFT },
  cardLabelDark: { color: "#c5cad3" },
  cardValueDark: { color: "#ffffff" },

  footStats: { flexDirection: "row", flexWrap: "wrap", marginTop: 18 },
  footStat: { fontSize: 8.5, color: PDF_MUTED, marginRight: 18, marginBottom: 3 },
  footStatStrong: { fontFamily: "Helvetica-Bold", color: PDF_INK },
});

interface LineProps {
  label: string;
  value: string;
  bold?: boolean;
}

function Line({ label, value, bold }: LineProps) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, ...(bold ? [styles.bold] : [])]}>{label}</Text>
      <Text style={[styles.lineValue, ...(bold ? [styles.bold] : [])]}>{value}</Text>
    </View>
  );
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return <Text style={styles.footer} fixed>{`Generado por Caja · ${generatedAt}`}</Text>;
}

export function StatementDocument({ statement: s, settings, generatedAt }: StatementDocumentProps) {
  const { currency, locale, decimals } = settings;
  const num = (n: number) => formatNumber(n, locale, decimals);
  const money = (n: number) => formatMoney(n, { currency, locale, decimals });
  const accent = settings.accent;
  const net = netColor(s.totals.teQueda, accent);

  const es = locale === "es";
  const range1 = es ? `Del 1 de enero al 31 de diciembre de ${s.year}` : `From January 1 to December 31, ${s.year}`;
  const range2 = es ? `Por el año terminado al 31 de diciembre de ${s.year}` : `For the year ended December 31, ${s.year}`;
  const monthName = (i: number | null) => (i == null ? "—" : MONTHS_FULL_ES[i]);
  const monthSaldo = (i: number | null) => (i == null ? "" : ` (${money(s.months[i].saldo)})`);

  return (
    <Document title={`Resumen ${s.businessName} ${s.year}`} author="Caja">
      {/* ---------- Formato 1 · Un solo paso ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tag}>Formato 1 · Un solo paso</Text>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{s.businessName}</Text>
          <Text style={styles.subtitle}>Estado de resultados</Text>
          <Text style={styles.dateRange}>{range1}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.section}>Ingresos</Text>
          <Line label="Ingresos por ventas / servicios" value={num(s.totals.entro)} />
          <Line label="Total de ingresos" value={num(s.totals.entro)} bold />

          <Text style={styles.section}>Gastos</Text>
          <Line label="Gastos de operación" value={num(s.totals.salio)} />
          <Line label="Total de gastos" value={num(s.totals.salio)} bold />

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Utilidad neta del año</Text>
            <Text style={[styles.netValue, { color: net }]}>{num(s.totals.teQueda)}</Text>
          </View>
        </View>
        <Footer generatedAt={generatedAt} />
      </Page>

      {/* ---------- Formato 2 · Pasos múltiples ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tag}>Formato 2 · Pasos múltiples</Text>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{s.businessName}</Text>
          <Text style={styles.subtitle}>Estado de resultados — formato detallado</Text>
          <Text style={styles.dateRange}>{range2}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.section}>Ingresos</Text>
          <Line label="Ingresos netos" value={num(s.totals.entro)} />

          <Text style={styles.section}>Gastos de operación</Text>
          <Line label="Gastos de operación" value={`(${num(s.totals.salio)})`} />
          <Line label="Total de gastos de operación" value={num(s.totals.salio)} bold />
          <Line label="Utilidad de operación" value={num(s.totals.teQueda)} bold />

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Utilidad neta del año</Text>
            <Text style={[styles.netValue, { color: net }]}>{num(s.totals.teQueda)}</Text>
          </View>

          <Text style={styles.note}>
            Nota: no se incluyen costo de ventas ni impuestos porque Caja registra solo el dinero que
            entra y sale del negocio.
          </Text>
        </View>
        <Footer generatedAt={generatedAt} />
      </Page>

      {/* ---------- Formato 3 · Comparativo mensual ---------- */}
      <Page size="A4" orientation="landscape" style={styles.pageWide}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topTitle}>{s.businessName}</Text>
            <Text style={styles.topSub}>Entró, salió y saldo, mes por mes</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.topRightTag}>Formato 3 · Comparativo mensual</Text>
            <Text style={styles.topTitle}>Resumen del año {s.year}</Text>
          </View>
        </View>

        <View>
          <View style={styles.tHeadRow}>
            <Text style={styles.tConceptHead}>Concepto</Text>
            {s.months.map((m) => (
              <Text key={m.monthIndex} style={styles.tMonthHead}>
                {MONTHS_SHORT_ES[m.monthIndex]}
              </Text>
            ))}
            <Text style={styles.tTotalHead}>Total</Text>
          </View>

          {([
            { label: "Entró", pick: (i: number) => s.months[i].entro, total: s.totals.entro },
            { label: "Salió", pick: (i: number) => s.months[i].salio, total: s.totals.salio },
            { label: "Saldo", pick: (i: number) => s.months[i].saldo, total: s.totals.teQueda },
          ] as const).map((rowDef) => (
            <View key={rowDef.label} style={styles.tRow}>
              <Text style={[styles.tConcept, styles.bold]}>{rowDef.label}</Text>
              {s.months.map((m) => (
                <Text key={m.monthIndex} style={styles.tMonth}>
                  {num(rowDef.pick(m.monthIndex))}
                </Text>
              ))}
              <Text style={styles.tTotal}>{num(rowDef.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cards}>
          <View style={[styles.card, { marginRight: 12 }]}>
            <Text style={styles.cardLabel}>Entró en el año</Text>
            <Text style={styles.cardValue}>{money(s.totals.entro)}</Text>
          </View>
          <View style={[styles.card, { marginRight: 12 }]}>
            <Text style={styles.cardLabel}>Salió en el año</Text>
            <Text style={styles.cardValue}>{money(s.totals.salio)}</Text>
          </View>
          <View style={[styles.card, styles.cardDark]}>
            <Text style={[styles.cardLabel, styles.cardLabelDark]}>Saldo del año</Text>
            <Text style={[styles.cardValue, styles.cardValueDark]}>{money(s.totals.teQueda)}</Text>
          </View>
        </View>

        <View style={styles.footStats}>
          <Text style={styles.footStat}>
            Mejor mes: <Text style={styles.footStatStrong}>{monthName(s.bestMonth)}</Text>
            {monthSaldo(s.bestMonth)}
          </Text>
          <Text style={styles.footStat}>
            Mes más flojo: <Text style={styles.footStatStrong}>{monthName(s.worstMonth)}</Text>
            {monthSaldo(s.worstMonth)}
          </Text>
          <Text style={styles.footStat}>
            Margen del año: <Text style={styles.footStatStrong}>{formatPercent(s.profitMargin, locale, 0)}</Text>
          </Text>
          <Text style={styles.footStat}>
            Promedio mensual <Text style={styles.footStatStrong}>{money(s.monthlyAverage)}</Text>
          </Text>
          <Text style={styles.footStat}>
            {s.positiveMonths} {s.positiveMonths === 1 ? "mes" : "meses"} en positivo, {s.negativeMonths} en negativo
          </Text>
        </View>
        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}
