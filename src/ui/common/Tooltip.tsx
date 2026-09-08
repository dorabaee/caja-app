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
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 8;
      const width = Math.min(260, Math.max(120, label.length * 7 + 20));
      let left = rect.left + rect.width / 2 - width / 2;
      let top = rect.bottom + gap;
      if (side === "left") {
        left = rect.left - width - gap;
        top = rect.top + rect.height / 2 - 16;
      } else if (side === "right") {
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - 16;
      } else if (side === "top") {
        top = rect.top - 40;
      }
      setPosition({
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - 40)),
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
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined } as object)}
      {open && createPortal(
        <span id={id} role="tooltip" className={styles.tip} style={position} data-side={side}>
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
