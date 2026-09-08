import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import type { Project, Table } from "@core/model/types";
import { Button, cn } from "@ui/common";
import styles from "./Tour.module.css";

export interface Step {
  /** CSS selector for the element to spotlight, or null for a centered card. */
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

export function tableHasMeaningfulData(table: Table): boolean {
  if (table.kind === "ledger" && (table.initialBalance ?? 0) !== 0) return true;
  return table.rows.some((row) => table.columns.some((column) => {
    // The numbered Día column is template structure, not business activity.
    if (table.kind === "income" && column.type === "text" && /^d[ií]a$/i.test(column.name)) return false;
    return !!(row.cells[column.id] ?? "").trim();
  }));
}

/** Build the tour from what is actually on the board. Empty businesses receive setup
 * help; present table types receive a purpose step; only empty tables receive the extra
 * first-entry explanation. */
export function buildTourSteps(project: Project | null, monthIndex: number): Step[] {
  const month = project?.months[monthIndex];
  const tables = month?.tables ?? [];
  const steps: Step[] = [
    { target: null, titleKey: "tour.welcomeTitle", bodyKey: "tour.welcomeBody" },
    { target: "[data-tour='businesses']", titleKey: "tour.businessesTitle", bodyKey: "tour.businessesBody" },
    { target: "[data-tour='views']", titleKey: "tour.viewsTitle", bodyKey: "tour.viewsBody" },
    { target: "[data-tour='kpi']", titleKey: "tour.kpiTitle", bodyKey: "tour.kpiBody" },
  ];
  if (!tables.length) {
    steps.push(
      { target: "[data-tour='empty-board']", titleKey: "tour.emptyTitle", bodyKey: "tour.emptyBody" },
      { target: "[data-tour='addTable']", titleKey: "tour.addTableTitle", bodyKey: "tour.addTableBody" },
    );
  } else {
    const kinds: Array<[string, Table | undefined]> = [
      ["income", tables.find((table) => table.kind === "income")],
      ["expense", tables.find((table) => table.kind === "expense")],
      ["ledger", tables.find((table) => table.kind === "ledger")],
      ["blank", tables.find((table) => table.kind === "none")],
    ];
    for (const [kind, table] of kinds) {
      if (!table) continue;
      steps.push({
        target: `[data-tour-table='${kind}']`,
        titleKey: `tour.${kind}Title`,
        bodyKey: `tour.${kind}Body`,
      });
      if (!tableHasMeaningfulData(table)) {
        steps.push({
          target: `[data-tour-table='${kind}']`,
          titleKey: `tour.${kind}EmptyTitle`,
          bodyKey: `tour.${kind}EmptyBody`,
        });
      }
    }
  }
  steps.push({ target: "[data-tour='months']", titleKey: "tour.monthsTitle", bodyKey: "tour.monthsBody" });
  if (tables.length || (month?.charts.length ?? 0) > 0) {
    steps.push(
      { target: "[data-tour='canvas']", titleKey: "tour.moveTitle", bodyKey: "tour.moveBody" },
      { target: "[data-tour='canvas']", titleKey: "tour.multiTitle", bodyKey: "tour.multiBody" },
    );
  }
  steps.push(
    { target: "[data-tour='help']", titleKey: "tour.shortcutsTitle", bodyKey: "tour.shortcutsBody" },
    { target: "[data-tour='settings']", titleKey: "tour.settingsTitle", bodyKey: "tour.settingsBody" },
  );
  return steps;
}

const PAD = 8;
const CARD_W = 320;
const GAP = 14;
const REVEAL_PAD = 20;

type RectEdges = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

/** Return the canvas scroll position that reveals the complete tour target. A table that
 * fits is centered; an oversized table is aligned to the top/left so its header and first
 * fields remain useful. Returning null avoids nudging a table that is already all visible. */
export function scrollPositionToReveal(
  viewport: RectEdges,
  target: RectEdges,
  current: { left: number; top: number },
  padding = REVEAL_PAD,
): { left: number; top: number } | null {
  const innerLeft = viewport.left + padding;
  const innerTop = viewport.top + padding;
  const innerRight = viewport.right - padding;
  const innerBottom = viewport.bottom - padding;
  const clipped = target.left < innerLeft
    || target.right > innerRight
    || target.top < innerTop
    || target.bottom > innerBottom;
  if (!clipped) return null;

  const availableWidth = Math.max(0, viewport.width - padding * 2);
  const availableHeight = Math.max(0, viewport.height - padding * 2);
  const targetLeftInViewport = target.left - viewport.left;
  const targetTopInViewport = target.top - viewport.top;
  const desiredLeft = target.width <= availableWidth
    ? targetLeftInViewport - padding - (availableWidth - target.width) / 2
    : targetLeftInViewport - padding;
  const desiredTop = target.height <= availableHeight
    ? targetTopInViewport - padding - (availableHeight - target.height) / 2
    : targetTopInViewport - padding;

  return {
    left: Math.max(0, current.left + desiredLeft),
    top: Math.max(0, current.top + desiredTop),
  };
}

export function Tour() {
  const { t } = useTranslation();
  const runTour = useStore((s) => s.doc.settings.runTour);
  const updateSettings = useStore((s) => s.updateSettings);
  const project = useStore((s) => s.doc.projects.find((p) => p.id === s.doc.currentProjectId) ?? null);
  const updateProject = useStore((s) => s.updateProject);
  const monthIndex = useUI((s) => s.monthIndex);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState({ width: CARD_W, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const steps = useMemo(() => buildTourSteps(project, monthIndex), [project, monthIndex]);
  const step = steps[Math.min(i, steps.length - 1)];

  useLayoutEffect(() => {
    if (!runTour || !cardRef.current) return;
    const measure = () => {
      const box = cardRef.current?.getBoundingClientRect();
      if (box) setCardSize({ width: box.width, height: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [runTour, i, step]);

  useLayoutEffect(() => {
    if (!runTour) return;
    const measure = () => {
      const el = step?.target ? document.querySelector(step.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const target = step?.target ? document.querySelector<HTMLElement>(step.target) : null;
    if (target) {
      const box = target.getBoundingClientRect();
      const isTableStep = target.hasAttribute("data-tour-table");
      const canvas = isTableStep ? target.closest<HTMLElement>("[data-tour='canvas']") : null;
      if (canvas) {
        const destination = scrollPositionToReveal(
          canvas.getBoundingClientRect(),
          box,
          { left: canvas.scrollLeft, top: canvas.scrollTop },
        );
        if (destination) canvas.scrollTo({ ...destination, behavior: "smooth" });
      } else {
        const clipped = box.bottom > window.innerHeight
          || box.top < 0
          || box.right > window.innerWidth
          || box.left < 0;
        if (clipped) target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      }
    }
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
    if (project?.onboarding && !project.onboarding.tourCompleted) {
      updateProject(project.id, { onboarding: { ...project.onboarding, tourCompleted: true } });
    }
    setI(0);
  };
  const isLast = i === steps.length - 1;
  const next = () => (isLast ? finish() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  // Measure the real translated card and choose a side that fits. This prevents a tall
  // message from covering small targets near the bottom (notably the sidebar help icon).
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardStyle: CSSProperties;
  let placement: "center" | "above" | "below" | "left" | "right" = "center";
  if (!rect) {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const cw = cardSize.width || CARD_W;
    const ch = cardSize.height || 220;
    const centeredLeft = Math.max(GAP, Math.min(rect.left + rect.width / 2 - cw / 2, vw - cw - GAP));
    const centeredTop = Math.max(GAP, Math.min(rect.top + rect.height / 2 - ch / 2, vh - ch - GAP));
    const candidates = [
      { placement: "below" as const, left: centeredLeft, top: rect.bottom + GAP, fits: rect.bottom + GAP + ch <= vh - GAP },
      { placement: "above" as const, left: centeredLeft, top: rect.top - GAP - ch, fits: rect.top - GAP - ch >= GAP },
      { placement: "right" as const, left: rect.right + GAP, top: centeredTop, fits: rect.right + GAP + cw <= vw - GAP },
      { placement: "left" as const, left: rect.left - GAP - cw, top: centeredTop, fits: rect.left - GAP - cw >= GAP },
    ];
    const chosen = candidates.find((candidate) => candidate.fits)
      ?? candidates.sort((a, b) => {
        const visibleA = Math.max(0, Math.min(vw, a.left + cw) - Math.max(0, a.left)) * Math.max(0, Math.min(vh, a.top + ch) - Math.max(0, a.top));
        const visibleB = Math.max(0, Math.min(vw, b.left + cw) - Math.max(0, b.left)) * Math.max(0, Math.min(vh, b.top + ch) - Math.max(0, b.top));
        return visibleB - visibleA;
      })[0];
    placement = chosen.placement;
    cardStyle = {
      left: Math.max(GAP, Math.min(chosen.left, vw - cw - GAP)),
      top: Math.max(GAP, Math.min(chosen.top, vh - ch - GAP)),
    };
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
          <div className={styles.progress}>{t("tour.progress", { n: i + 1, total: steps.length })}</div>
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
        {rect && <span className={cn(styles.caret, styles[`caret_${placement}`])} aria-hidden />}
      </div>
    </div>,
    document.body,
  );
}
