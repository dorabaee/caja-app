import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@core/store";
import { Button } from "@ui/common";
import styles from "./Tour.module.css";

interface Step {
  /** CSS selector for the element to spotlight, or null for a centered card. */
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

const STEPS: Step[] = [
  { target: null, titleKey: "tour.welcomeTitle", bodyKey: "tour.welcomeBody" },
  { target: "[data-tour='businesses']", titleKey: "tour.businessesTitle", bodyKey: "tour.businessesBody" },
  { target: "[data-tour='views']", titleKey: "tour.viewsTitle", bodyKey: "tour.viewsBody" },
  { target: "[data-tour='kpi']", titleKey: "tour.kpiTitle", bodyKey: "tour.kpiBody" },
  { target: "[data-tour='addTable']", titleKey: "tour.addTableTitle", bodyKey: "tour.addTableBody" },
  { target: "[data-tour='months']", titleKey: "tour.monthsTitle", bodyKey: "tour.monthsBody" },
  { target: "[data-tour='settings']", titleKey: "tour.settingsTitle", bodyKey: "tour.settingsBody" },
];

const PAD = 8;
const CARD_W = 320;
const GAP = 14;

export function Tour() {
  const { t } = useTranslation();
  const runTour = useStore((s) => s.doc.settings.runTour);
  const updateSettings = useStore((s) => s.updateSettings);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = STEPS[i];

  useLayoutEffect(() => {
    if (!runTour) return;
    const measure = () => {
      const el = step?.target ? document.querySelector(step.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [runTour, i, step]);

  // Focus management: move focus into the dialog, close on Escape, trap Tab.
  useEffect(() => {
    if (!runTour) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        updateSettings({ runTour: false });
        setI(0);
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const f = card.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [runTour, i, updateSettings]);

  if (!runTour) return null;

  const finish = () => {
    updateSettings({ runTour: false });
    setI(0);
  };
  const isLast = i === STEPS.length - 1;
  const next = () => (isLast ? finish() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  // Card placement: centered when there's no target, else below the target
  // (above if it would overflow the viewport bottom), horizontally clamped.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardStyle: CSSProperties;
  if (!rect) {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const below = rect.bottom + GAP;
    const placeAbove = below + 180 > vh;
    const top = placeAbove ? Math.max(GAP, rect.top - GAP - 180) : below;
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(GAP, Math.min(left, vw - CARD_W - GAP));
    cardStyle = { left, top };
  }

  return createPortal(
    <div className={styles.overlay}>
      {rect && (
        <div
          className={styles.spotlight}
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        className={styles.card}
        style={{ width: CARD_W, ...cardStyle }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
      >
        {/* Keyed on step index so the message content re-mounts and fades/slides in on
            each step change (the nav buttons below stay stable). */}
        <div key={i} className={styles.step}>
          <div className={styles.progress}>{t("tour.progress", { n: i + 1, total: STEPS.length })}</div>
          <h2 id={titleId} className={styles.title}>
            {t(step.titleKey)}
          </h2>
          <p id={bodyId} className={styles.body}>
            {t(step.bodyKey)}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={finish}>
            {t("tour.skip")}
          </button>
          <div className={styles.nav}>
            {i > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>
                {t("tour.back")}
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={next}>
              {isLast ? t("tour.done") : t("tour.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
