import { cloneElement, useId, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

export function Tooltip({ label, children, side = "left" }: {
  label: string;
  children: ReactElement;
  side?: "left" | "right" | "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 8;
      const width = tipRef.current?.offsetWidth ?? 160;
      const height = tipRef.current?.offsetHeight ?? 32;
      let left = rect.left + rect.width / 2 - width / 2;
      let top = rect.bottom + gap;
      if (side === "left") {
        left = rect.left - width - gap;
        top = rect.top + rect.height / 2 - height / 2;
      } else if (side === "right") {
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - height / 2;
      } else if (side === "top") {
        top = rect.top - height - gap;
      }
      if (top + height > window.innerHeight - 8) top = rect.top - height - gap;
      setPosition({
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - height - 8)),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [label, open, side]);

  return (
    <span
      ref={anchorRef}
      className={styles.anchor}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDownCapture={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined } as object)}
      {open && createPortal(
        <span ref={tipRef} id={id} role="tooltip" className={styles.tip} style={position} data-side={side}>
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
