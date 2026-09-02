import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  Table2,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { TemplateKey } from "@core/model/defaults";
import { Button, cn } from "@ui/common";
import styles from "./TemplatePreview.module.css";

/** One frame of a template's looping demo: what the mock table shows at that moment. */
interface Frame {
  /** Rows visible so far; a cell of `null` hasn't been filled in yet. */
  rows: (string | null)[][];
  /** Value in the footer (total / saldo final). */
  total?: string;
  /** Index of the row that just changed — it flashes to draw the eye. */
  active?: number;
  /** Highlight the footer instead (the total updating). */
  activeTotal?: boolean;
}

interface Demo {
  columns: string[];
  /** Column index that carries a category tag chip once filled. */
  tagColumn?: number;
  /** Right-align these columns (money). */
  numeric: number[];
  footerLabel: string;
  frames: Frame[];
}

const ORDER: TemplateKey[] = ["income", "expense", "ledger", "blank"];

const ICONS: Record<TemplateKey, React.ReactNode> = {
  income: <TrendingUp size={18} />,
  expense: <TrendingDown size={18} />,
  ledger: <Landmark size={18} />,
  blank: <Table2 size={18} />,
};

const TITLE_KEY: Record<TemplateKey, string> = {
  income: "shell.tplIncome",
  expense: "shell.tplExpense",
  ledger: "shell.tplLedger",
  blank: "shell.tplBlank",
};

/**
 * Each template's demo, as a list of frames the preview cycles through. Written as data
 * rather than CSS keyframes so the steps below can stay in lockstep with the animation
 * and the whole thing reads top to bottom.
 */
const DEMOS: Record<TemplateKey, Demo> = {
  income: {
    columns: ["Día", "Efectivo recibido"],
    numeric: [1],
    footerLabel: "Total",
    frames: [
      { rows: [["1", null], ["2", null], ["3", null]], total: "0.00" },
      { rows: [["1", "784.00"], ["2", null], ["3", null]], total: "784.00", active: 0 },
      { rows: [["1", "784.00"], ["2", "1,020.00"], ["3", null]], total: "1,804.00", active: 1 },
      { rows: [["1", "784.00"], ["2", "1,020.00"], ["3", "560.00"]], total: "2,364.00", active: 2 },
      { rows: [["1", "784.00"], ["2", "1,020.00"], ["3", "560.00"]], total: "2,364.00", activeTotal: true },
    ],
  },
  expense: {
    columns: ["Fecha", "Descripción", "Monto"],
    tagColumn: 1,
    numeric: [2],
    footerLabel: "Total",
    frames: [
      { rows: [[null, null, null]], total: "0.00" },
      { rows: [["10/09/2026", null, null]], total: "0.00", active: 0 },
      { rows: [["10/09/2026", "Gasolina", null]], total: "0.00", active: 0 },
      { rows: [["10/09/2026", "Gasolina", "450.00"]], total: "450.00", active: 0 },
      {
        rows: [["10/09/2026", "Gasolina", "450.00"], ["12/09/2026", "Servicios", "780.00"]],
        total: "1,230.00",
        active: 1,
      },
    ],
  },
  ledger: {
    columns: ["Fecha", "Depósito", "Gasto"],
    numeric: [1, 2],
    footerLabel: "Saldo final",
    frames: [
      { rows: [[null, null, null]], total: "1,000.00" },
      { rows: [["03/09/2026", "5,000.00", null]], total: "6,000.00", active: 0 },
      {
        rows: [["03/09/2026", "5,000.00", null], ["11/09/2026", null, "1,240.00"]],
        total: "4,760.00",
        active: 1,
      },
      {
        rows: [["03/09/2026", "5,000.00", null], ["11/09/2026", null, "1,240.00"]],
        total: "4,760.00",
        activeTotal: true,
      },
    ],
  },
  blank: {
    columns: ["Concepto", "Monto"],
    numeric: [1],
    footerLabel: "Total",
    frames: [
      { rows: [[null, null]], total: "0.00" },
      { rows: [["Renta", null]], total: "0.00", active: 0 },
      { rows: [["Renta", "3,500.00"]], total: "3,500.00", active: 0 },
      { rows: [["Renta", "3,500.00"], ["Internet", "600.00"]], total: "4,100.00", active: 1 },
    ],
  },
};

const FRAME_MS = 1500;

/** The looping mock table — a miniature, non-interactive stand-in for the real widget. */
function MockTable({ template, frame }: { template: TemplateKey; frame: number }) {
  const demo = DEMOS[template];
  const f = demo.frames[frame % demo.frames.length];
  return (
    <div className={styles.mock} aria-hidden>
      <div className={styles.mockHead}>
        {demo.columns.map((c, i) => (
          <span key={c} className={cn(styles.mockCell, demo.numeric.includes(i) && styles.mockNum)}>
            {c}
          </span>
        ))}
      </div>
      {f.rows.map((row, ri) => (
        <div key={ri} className={cn(styles.mockRow, f.active === ri && styles.mockRowActive)}>
          {row.map((cell, ci) => (
            <span
              key={ci}
              className={cn(styles.mockCell, demo.numeric.includes(ci) && styles.mockNum)}
            >
              {cell == null ? (
                <span className={styles.mockGhost} />
              ) : demo.tagColumn === ci ? (
                <span className={styles.mockTag}>
                  <Tag size={10} aria-hidden />
                  {cell}
                </span>
              ) : (
                <span className={styles.mockValue} key={cell}>
                  {cell}
                </span>
              )}
            </span>
          ))}
        </div>
      ))}
      <div className={cn(styles.mockFoot, f.activeTotal && styles.mockFootActive)}>
        <span className={styles.mockCell}>{demo.footerLabel}</span>
        <span className={cn(styles.mockCell, styles.mockNum, styles.mockTotal)} key={f.total}>
          {f.total}
        </span>
      </div>
    </div>
  );
}

/**
 * The "?" preview: a dimmed overlay (the same treatment the guided tour uses) with a
 * looping demo of the chosen template, three short steps, and a button that creates it.
 * Arrows flip between templates without going back to the menu.
 */
export function TemplatePreview({
  open,
  template,
  onClose,
  onUse,
}: {
  open: boolean;
  template: TemplateKey;
  onClose: () => void;
  onUse: (template: TemplateKey) => void;
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<TemplateKey>(template);
  const [frame, setFrame] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setCurrent(template), [template]);
  useEffect(() => setFrame(0), [current]);

  // Drive the loop. Reduced motion pins it to the last frame — the finished table — so
  // the information is all there without anything moving.
  useEffect(() => {
    if (!open) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFrame(DEMOS[current].frames.length - 1);
      return;
    }
    const id = setInterval(() => setFrame((n) => n + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  const step = (dir: 1 | -1) => {
    const i = ORDER.indexOf(current);
    setCurrent(ORDER[(i + dir + ORDER.length) % ORDER.length]);
  };

  const frames = DEMOS[current].frames;
  const stepIndex = Math.min(2, Math.floor((frame % frames.length) / (frames.length / 3)));

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span className={styles.icon} aria-hidden>
            {ICONS[current]}
          </span>
          <h2 id={titleId} className={styles.title}>
            {t(TITLE_KEY[current])}
          </h2>
          <button type="button" className={styles.close} aria-label={t("common.close")} onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <p className={styles.purpose}>{t(`preview.${current}.purpose`)}</p>

        <div className={styles.stage}>
          <button
            type="button"
            className={cn(styles.arrow, styles.arrowLeft)}
            aria-label={t("preview.previous")}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <MockTable template={current} frame={frame} />
          <button
            type="button"
            className={cn(styles.arrow, styles.arrowRight)}
            aria-label={t("preview.next")}
            onClick={() => step(1)}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>

        <ol className={styles.steps}>
          {[0, 1, 2].map((i) => (
            <li key={i} className={cn(styles.step, stepIndex === i && styles.stepOn)}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span>{t(`preview.${current}.step${i + 1}`)}</span>
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <div className={styles.dots} aria-hidden>
            {ORDER.map((k) => (
              <span key={k} className={cn(styles.dot, k === current && styles.dotOn)} />
            ))}
          </div>
          <div className={styles.buttons}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => onUse(current)}>
              {t("preview.use")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
