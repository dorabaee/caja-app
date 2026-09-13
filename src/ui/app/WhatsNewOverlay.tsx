import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, ArrowDownToLine, ChartColumn, Check, FileText, HelpCircle, Layers, Pause, Play, Sparkles } from "lucide-react";
import { Modal, cn } from "@ui/common";
import appPackage from "../../../package.json";
import styles from "./WhatsNewOverlay.module.css";

const SLIDES = ["updates", "help", "pdf"] as const;
function Demo({ kind }: { kind: typeof SLIDES[number] }) {
  const { t } = useTranslation();
  const text = (key: string) => t(`shell.release027.${key}`);
  return <div className={styles.demo027} aria-hidden>
    {kind === "updates" && <><span className={styles.demoHeading}><ArrowDownToLine size={20} /> {text("available")}</span><div className={styles.download027}><span>{text("downloading")}</span><i /></div><span className={styles.done027}><Check size={16} />{text("restart")}</span></>}
    {kind === "help" && <><span className={styles.demoHeading}>{text("table")} <HelpCircle className={styles.helpPulse027} size={22} /></span><div className={styles.table027}>{[1,2,3].map((n) => <span key={n}><i /> <b>${n * 120}</b></span>)}</div><div className={styles.explain027}>{text("explainer")}</div></>}
    {kind === "pdf" && <><div className={styles.pages027}>{[1,2,3,4,5,6].map((n) => <span key={n} style={{ animationDelay: `${n * .12}s` }}><FileText size={22} /><small>{n}</small></span>)}</div><span className={styles.demoHeading}><Layers size={18} />{text("onePdf")}</span><div className={styles.chart027}><ChartColumn size={16} />{[40,65,48,82,58,95].map((height,i) => <i key={i} style={{ height: `${height}%`, animationDelay: `${i * .1}s` }} />)}</div></>}
  </div>;
}

export function WhatsNewOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const regionId = useId();
  useEffect(() => { if (open) { setIndex(0); setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); } }, [open]);
  useEffect(() => {
    if (!open || !playing) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), 6500);
    return () => window.clearTimeout(timer);
  }, [open, playing, index]);
  const move = (next: number) => setIndex((next + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[index % SLIDES.length];
  return <Modal open={open} onClose={onClose} size="lg" title={t("shell.whatsNewTitle")} description={t("shell.release027.intro")}>
    <div className={styles.stage} id={regionId} aria-live={playing ? "off" : "polite"} data-paused={!playing}>
      <div className={styles.copy} key={`${slide}-copy`}><span className={styles.eyebrow}><Sparkles size={14} />Caja v{appPackage.version}</span><h3>{t(`shell.release027.${slide}Title`)}</h3><p>{t(`shell.release027.${slide}Desc`)}</p></div>
      <div className={styles.visual} key={slide}><Demo kind={slide} /></div>
    </div>
    <div className={styles.controls}>
      <button type="button" className={styles.arrow} aria-label={t("tour.back")} onClick={() => move(index-1)}><ArrowLeft size={16} /></button>
      <div className={styles.dots} aria-label={t("shell.whatsNewTitle")}>{SLIDES.map((item, i) => <button key={item} type="button" aria-current={i === index ? "step" : undefined} aria-label={t(`shell.release027.${item}Title`)} className={cn(styles.dot, i === index && styles.dotOn)} onClick={() => move(i)} />)}</div>
      <button type="button" className={styles.arrow} aria-label={t(playing ? "shell.release027.pause" : "shell.release027.play")} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" className={styles.arrow} aria-label={t("tour.next")} onClick={() => move(index+1)}><ArrowRight size={16} /></button>
    </div>
  </Modal>;
}
