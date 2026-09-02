import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@ui/common";
import styles from "./ShortcutsOverlay.module.css";

/** A key cap. */
function K({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

/** Tiny looping demos, one per gesture — a picture beats a paragraph for these. */
const DEMOS: Record<string, ReactNode> = {
  marquee: (
    <span className={styles.demo}>
      <span className={styles.demoBox} style={{ left: 6, top: 6 }} />
      <span className={styles.demoBox} style={{ left: 30, top: 14 }} />
      <span className={styles.demoMarquee} />
    </span>
  ),
  move: (
    <span className={styles.demo}>
      <span className={`${styles.demoBox} ${styles.demoMove}`} style={{ left: 6, top: 10 }} />
      <span className={`${styles.demoBox} ${styles.demoMove}`} style={{ left: 26, top: 18 }} />
    </span>
  ),
  snap: (
    <span className={styles.demo}>
      <span className={styles.demoBox} style={{ left: 8, top: 6 }} />
      <span className={`${styles.demoBox} ${styles.demoSnap}`} style={{ top: 24 }} />
      <span className={styles.demoGuide} style={{ left: 8 }} />
    </span>
  ),
  pan: (
    <span className={styles.demo}>
      <span className={`${styles.demoBox} ${styles.demoPan}`} style={{ left: 4, top: 8 }} />
      <span className={`${styles.demoBox} ${styles.demoPan}`} style={{ left: 28, top: 20 }} />
    </span>
  ),
  zoom: (
    <span className={styles.demo}>
      <span className={`${styles.demoBox} ${styles.demoZoom}`} style={{ left: 18, top: 12 }} />
    </span>
  ),
  add: (
    <span className={styles.demo}>
      <span className={`${styles.demoBox} ${styles.demoPop}`} style={{ left: 20, top: 12 }} />
    </span>
  ),
};

/**
 * The canvas cheat sheet, opened from the sidebar's help button. The guided tour shows
 * these once; this is where you come back to look them up, which is why it lives behind
 * a permanent control rather than only in the tour.
 */
export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const row = (demo: ReactNode, keys: ReactNode, textKey: string) => (
    <li className={styles.row} key={textKey}>
      {demo ?? <span className={styles.demo} />}
      <span className={styles.rowText}>
        <span className={styles.keys}>{keys}</span>
        <span className={styles.desc}>{t(textKey)}</span>
      </span>
    </li>
  );

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
          <h2 id={titleId} className={styles.title}>
            {t("shortcuts.title")}
          </h2>
          <button type="button" className={styles.close} aria-label={t("common.close")} onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className={styles.intro}>{t("shortcuts.intro")}</p>

        <div className={styles.groups}>
          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t("shortcuts.selecting")}</h3>
            <ul className={styles.list}>
              {row(DEMOS.marquee, <><K>Ctrl</K> + {t("shortcuts.drag")}</>, "shortcuts.marquee")}
              {row(null, <><K>Ctrl</K> / <K>Shift</K> + {t("shortcuts.click")}</>, "shortcuts.addRemove")}
              {row(null, <><K>Ctrl</K> + <K>A</K></>, "shortcuts.selectAll")}
              {row(null, <K>Esc</K>, "shortcuts.clear")}
            </ul>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t("shortcuts.moving")}</h3>
            <ul className={styles.list}>
              {row(DEMOS.move, t("shortcuts.drag"), "shortcuts.groupDrag")}
              {row(DEMOS.snap, t("shortcuts.drag"), "shortcuts.snap")}
              {row(null, <K>Alt</K>, "shortcuts.noSnap")}
              {row(null, <><K>↑</K><K>↓</K><K>←</K><K>→</K></>, "shortcuts.nudge")}
              {row(null, <><K>Shift</K> + <K>↑</K></>, "shortcuts.nudgeFine")}
            </ul>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t("shortcuts.canvas")}</h3>
            <ul className={styles.list}>
              {row(DEMOS.pan, <><K>Espacio</K> + {t("shortcuts.drag")}</>, "shortcuts.pan")}
              {row(DEMOS.zoom, <><K>Ctrl</K> + {t("shortcuts.wheel")}</>, "shortcuts.zoom")}
              {row(DEMOS.add, t("shortcuts.doubleClick"), "shortcuts.addHere")}
              {row(null, t("shortcuts.rightClick"), "shortcuts.contextMenu")}
            </ul>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t("shortcuts.editing")}</h3>
            <ul className={styles.list}>
              {row(null, <><K>Ctrl</K> + <K>D</K></>, "shortcuts.duplicate")}
              {row(null, <K>Supr</K>, "shortcuts.delete")}
              {row(null, <><K>Ctrl</K> + <K>Z</K></>, "shortcuts.undo")}
              {row(null, <><K>Ctrl</K> + <K>Y</K></>, "shortcuts.redo")}
            </ul>
          </section>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" size="sm" onClick={onClose}>
            {t("tour.done")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
