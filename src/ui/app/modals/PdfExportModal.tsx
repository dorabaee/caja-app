import { useEffect, useState } from "react";
import { FileText, Download, Layers, ChartColumn } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { STATEMENT_FORMATS, DEFAULT_STATEMENT_OPTIONS, type StatementFormat } from "@core/export/statementFormats";
import { Button, Modal } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useExport } from "@ui/hooks/useExport";
import { statementCopy, statementMonths } from "@ui/pdf/statementCopy";
import styles from "./PdfExportModal.module.css";

export function PdfExportModal() {
  const open = useUI((s) => s.modal === "pdf");
  const close = useUI((s) => s.closeModal);
  const month = useUI((s) => s.monthIndex);
  const project = useCurrentProject();
  const locale = useStore((s) => s.doc.settings.locale);
  const c = statementCopy[locale];
  const [formats, setFormats] = useState<StatementFormat[]>(DEFAULT_STATEMENT_OPTIONS.formats);
  const [charts, setCharts] = useState(true);
  const [throughMonth, setThroughMonth] = useState(month);
  const [busy, setBusy] = useState(false);
  const { exportStatementPdf } = useExport();
  useEffect(() => { if (open) setThroughMonth(month); }, [open, month]);
  if (!project) return null;
  const save = async (all = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (await exportStatementPdf(project, { formats: all ? [...STATEMENT_FORMATS] : formats, charts, throughMonth })) close();
    } finally { setBusy(false); }
  };
  return <Modal open={open} onClose={() => { if (!busy) close(); }} size="lg" title={c.select} description={`${project.name} · ${c.description}`}
    footer={<><Button variant="ghost" disabled={busy} onClick={close}>{c.cancel}</Button><Button variant="secondary" icon={<Layers />} disabled={busy} onClick={() => void save(true)}>{c.all}</Button><Button variant="primary" icon={<Download />} disabled={busy || !formats.length} onClick={() => void save()}>{busy ? c.generating : c.selected}</Button></>}>
    <fieldset className={styles.fieldset} disabled={busy}>
      <legend className={styles.count}>{formats.length} / 6 {c.pages}</legend>
      <div className={styles.grid}>{STATEMENT_FORMATS.map((format, i) => <label key={format} className={styles.option} data-selected={formats.includes(format)}>
        <input type="checkbox" checked={formats.includes(format)} onChange={(e) => setFormats((current) => e.target.checked ? [...current, format] : current.filter((f) => f !== format))} />
        <span className={styles.tile}><FileText size={18} /><small>{String(i + 1).padStart(2, "0")}</small></span>
        <span><strong>{c.formats[format]}</strong><small>{c.descriptions[format]}</small></span>
      </label>)}</div>
      <div className={styles.settings}>
        <label className={styles.chartToggle}><input type="checkbox" checked={charts} onChange={(e) => setCharts(e.target.checked)} /><ChartColumn size={18} />{c.charts}</label>
        <label className={styles.cutoff}>{c.through}<select value={throughMonth} onChange={(e) => setThroughMonth(Number(e.target.value))}>{statementMonths(locale).map((name, i) => <option value={i} key={name}>{name}</option>)}</select></label>
      </div>
    </fieldset>
    <p className={styles.note}>{c.ready}</p>
  </Modal>;
}
