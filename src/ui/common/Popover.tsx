import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface PopoverApi {
  close: () => void;
}

export interface PopoverProps {
  /** A button-like element; cloned with ref + click handler + aria. */
  trigger: ReactElement;
  align?: "start" | "end";
  minWidth?: number;
  /** Class applied to the floating container (visual styling lives with the caller). */
  className?: string;
  /** ARIA role for the floating container (e.g. "menu"). */
  role?: string;
  children: ReactNode | ((api: PopoverApi) => ReactNode);
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  align = "start",
  minWidth = 184,
  className,
  role,
  children,
  onOpenChange,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const setOpenN = useCallback(
    (v: boolean) => {
      setOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange],
  );
  const close = useCallback(() => setOpenN(false), [setOpenN]);

  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const p = popRef.current;
    const pw = p?.offsetWidth ?? minWidth;
    const ph = p?.offsetHeight ?? 0;
    const gap = 6;
    let left = align === "end" ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + gap;
    if (ph && top + ph > window.innerHeight - 8) top = Math.max(8, r.top - gap - ph);
    setPos({ top, left });
  }, [align, minWidth]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpenN(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenN(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, setOpenN]);

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ref: triggerRef,
        onClick: (e: ReactMouseEvent) => {
          e.stopPropagation();
          setOpenN(!open);
        },
        "aria-haspopup": "true",
        "aria-expanded": open,
      })
    : trigger;

  return (
    <>
      {triggerEl}
      {open &&
        createPortal(
          <div
            ref={popRef}
            className={className}
            role={role}
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              minWidth,
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {typeof children === "function" ? children({ close }) : children}
          </div>,
          document.body,
        )}
    </>
  );
}
