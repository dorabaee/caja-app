import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, HelpCircle, Redo2, Share2, Sparkles, Tags, Undo2 } from "lucide-react";
import { Modal, cn } from "@ui/common";
import appPackage from "../../../package.json";
import styles from "./WhatsNewOverlay.module.css";

const SLIDES = [
  { title: "shell.whatsNewGuided", desc: "shell.whatsNewGuidedDesc", demo: "guided" },
  { title: "shell.whatsNewFill", desc: "shell.whatsNewFillDesc", demo: "fill" },
  { title: "shell.whatsNewPolish", desc: "shell.whatsNewPolishDesc", demo: "polish" },
] as const;

function Demo({ kind }: { kind: (typeof SLIDES)[number]["demo"] }) {
  if (kind === "guided") {
    return (
      <div className={styles.guidedDemo} aria-hidden>
        <span className={styles.guidedTitle}><GraduationCap size={17} /> Ejemplo guiado</span>
        <span className={styles.tableTiles}>
          <i>Ingresos</i><i>Gastos</i><i><BookOpen size={13} /> Banco</i><i>Metas</i>
        </span>
        <span className={styles.tourLine}><Sparkles size={14} /> Recorrido contextual</span>
      </div>
    );
  }
  if (kind === "polish") {
    return (
      <div className={styles.polishDemo} aria-hidden>
        <span className={styles.historyDemo}><Undo2 size={17} /><Redo2 size={17} /></span>
        <span className={styles.helpDemo}><HelpCircle size={16} /> Ayuda de plantillas</span>
        <span className={styles.categoryDemo}><Tags size={15} /> Material e insumos</span>
      </div>
    );
  }
  return (
    <div className={styles.fillDemo} aria-hidden>
      <span className={styles.fillKey}>↕</span>
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
