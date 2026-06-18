import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "./IconButton";
import { cn } from "./cn";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const card = cardRef.current;
      if (card && !card.contains(document.activeElement)) card.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className={cn(styles.card, styles[size])}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
      >
        {(title || description) && (
          <header className={styles.header}>
            <div className={styles.headerText}>
              {title && <h2 className={styles.title}>{title}</h2>}
              {description && <p className={styles.desc}>{description}</p>}
            </div>
            <IconButton label={t("common.close")} icon={<X />} size="sm" onClick={onClose} />
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
