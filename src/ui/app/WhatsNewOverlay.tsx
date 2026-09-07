import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CalendarDays, Share2, Sparkles, Zap } from "lucide-react";
import { Modal, cn } from "@ui/common";
import appPackage from "../../../package.json";
import styles from "./WhatsNewOverlay.module.css";

const SLIDES = [
  { title: "shell.whatsNewDates", desc: "shell.whatsNewDatesDesc", demo: "dates" },
  { title: "shell.whatsNewQuick", desc: "shell.whatsNewQuickDesc", demo: "quick" },
  { title: "shell.whatsNewFill", desc: "shell.whatsNewFillDesc", demo: "fill" },
] as const;

function Demo({ kind }: { kind: (typeof SLIDES)[number]["demo"] }) {
  if (kind === "dates") {
    return (
      <div className={styles.dateDemo} aria-hidden>
        <span className={styles.mockLabel}>FECHA</span>
        <span className={styles.mockDate}><CalendarDays size={18} /> 18 / agosto</span>
        <span className={styles.calendar}><i>17</i><i className={styles.dayOn}>18</i><i>19</i></span>
      </div>
    );
  }
  if (kind === "quick") {
    return (
      <div className={styles.quickDemo} aria-hidden>
        <span className={styles.quickTable}><Zap size={16} /> Banco Fiscal</span>
        <span className={styles.route}><b>Monto</b><ArrowRight size={14} /><em>Depósito</em></span>
        <span className={styles.route}><b>Fecha</b><ArrowRight size={14} /><em>Fecha de depósito</em></span>
      </div>
    );
  }
  return (
    <div className={styles.fillDemo} aria-hidden>
      <span className={styles.fillKey}>Ctrl + D</span>
      <span className={styles.fillGrid}>
        {["$420", "$420", "$420", "$420"].map((value, index) => <i key={index} className={index === 0 ? styles.fillSource : undefined}>{value}</i>)}
      </span>
    </div>
  );
}

/** Separate, replayable release carousel. Its CSS demos loop without external media. */
export function WhatsNewOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const regionId = useId();

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), 4500);
    return () => window.clearInterval(timer);
  }, [open]);

  const slide = SLIDES[index];
  const move = (delta: number) => setIndex((current) => (current + delta + SLIDES.length) % SLIDES.length);

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t("shell.whatsNewTitle")} description={t("shell.whatsNewIntro")}>
      <div className={styles.stage} id={regionId} aria-live="polite">
        <div className={styles.copy} key={`${slide.demo}-copy`}>
          <span className={styles.eyebrow}><Sparkles size={14} /> Caja v{appPackage.version}</span>
          <h3>{t(slide.title)}</h3>
          <p>{t(slide.desc)}</p>
        </div>
        <div className={styles.visual} key={slide.demo}><Demo kind={slide.demo} /></div>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} aria-label={t("tour.back")} onClick={() => move(-1)}><ArrowLeft size={16} /></button>
        <div className={styles.dots} role="tablist" aria-controls={regionId}>
          {SLIDES.map((item, itemIndex) => (
            <button key={item.demo} type="button" role="tab" aria-selected={itemIndex === index} aria-label={t(item.title)}
              className={cn(styles.dot, itemIndex === index && styles.dotOn)} onClick={() => setIndex(itemIndex)} />
          ))}
        </div>
        <button type="button" className={styles.arrow} aria-label={t("tour.next")} onClick={() => move(1)}><ArrowRight size={16} /></button>
      </div>
      <div className={styles.exportHint}><Share2 size={14} /><span>{t("shell.export")}</span></div>
    </Modal>
  );
}
