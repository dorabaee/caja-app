import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Popover } from "./Popover";
import styles from "./ConfirmPopover.module.css";

/**
 * "Are you sure?" anchored to whatever you're about to destroy, rather than a modal that
 * covers the thing being deleted. One implementation so every destructive X in the app —
 * a column, a category, a bank account — asks the same way.
 */
export function ConfirmPopover({
  trigger,
  message,
  confirmLabel,
  onConfirm,
  align = "start",
}: {
  /** The control that opens it, usually the X itself. */
  trigger: ReactElement;
  message: string;
  /** Defaults to "Sí"; pass something specific when the action deserves naming. */
  confirmLabel?: string;
  onConfirm: () => void;
  /** "start" keeps the panel under the trigger; an X is small, so ending at its right
   *  edge would fling the panel off to the left, away from what it's asking about. */
  align?: "start" | "end";
}) {
  const { t } = useTranslation();
  return (
    <Popover align={align} minWidth={248} className={styles.pop} trigger={trigger}>
      {({ close }) => (
        <div className={styles.panel}>
          <p className={styles.text}>{message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.no} onClick={close}>
              {t("common.no")}
            </button>
            <button
              type="button"
              className={styles.yes}
              onClick={() => {
                onConfirm();
                close();
              }}
            >
              {confirmLabel ?? t("common.yes")}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
