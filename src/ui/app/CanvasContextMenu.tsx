import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ClipboardCopy,
  Copy,
  Landmark,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { TemplateKey } from "@core/model/defaults";
import { useStore, useUI } from "@core/store";
import styles from "./CanvasContextMenu.module.css";

/** Right-clicking a widget, or double-clicking bare canvas to drop a table there. */
export type CanvasMenuState =
  | { x: number; y: number; widgetId: string; spot?: undefined }
  | { x: number; y: number; spot: { x: number; y: number }; widgetId?: undefined };

const TEMPLATES: { key: TemplateKey; icon: React.ReactNode; labelKey: string }[] = [
  { key: "income", icon: <TrendingUp size={15} />, labelKey: "shell.tplIncome" },
  { key: "expense", icon: <TrendingDown size={15} />, labelKey: "shell.tplExpense" },
  { key: "ledger", icon: <Landmark size={15} />, labelKey: "shell.tplLedger" },
  { key: "blank", icon: <Table2 size={15} />, labelKey: "shell.tplBlank" },
];

export function CanvasContextMenu({
  monthIndex,
  state,
  onClose,
}: {
  monthIndex: number;
  state: CanvasMenuState | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const selectedIds = useUI((s) => s.selectedIds);
  const selectMany = useUI((s) => s.selectMany);
  const select = useUI((s) => s.select);
  const clearSelection = useUI((s) => s.clearSelection);

  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  const s = useStore.getState;
  const ids = state.widgetId
    ? selectedIds.has(state.widgetId)
      ? [...selectedIds]
      : [state.widgetId]
    : [];
  const many = ids.length > 1;

  // Keep the menu on screen when it's opened near an edge.
  const left = Math.min(state.x, window.innerWidth - 230);
  const top = Math.min(state.y, window.innerHeight - 260);

  const item = (
    key: string,
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger?: boolean,
  ) => (
    <button
      key={key}
      type="button"
      className={danger ? `${styles.item} ${styles.danger}` : styles.item}
      onClick={() => {
        onClick();
        onClose();
      }}
    >
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );

  return createPortal(
    <div ref={ref} className={styles.menu} style={{ left, top }} role="menu">
      {state.spot ? (
        <>
          <p className={styles.label}>{t("shell.templates")}</p>
          {TEMPLATES.map((tpl) =>
            item(tpl.key, tpl.icon, t(tpl.labelKey), () => {
              const id = s().addTable(monthIndex, tpl.key);
              // Land exactly where the user double-clicked, not in the next packed slot.
              s().setWidgetLayout(monthIndex, id, state.spot);
              select(id);
            }),
          )}
        </>
      ) : (
        <>
          <p className={styles.label}>
            {many ? t("month.selectedCount", { count: ids.length }) : t("widgets.tableOptions")}
          </p>
          {item("dup", <Copy size={15} />, t("common.duplicate"), () =>
            selectMany(s().duplicateWidgets(monthIndex, ids)),
          )}
          {!many &&
            item("copy", <ClipboardCopy size={15} />, t("widgets.copyTable"), () => {
              const table = s()
                .doc.projects.find((p) => p.id === s().doc.currentProjectId)
                ?.months[monthIndex]?.tables.find((tb) => tb.id === ids[0]);
              if (!table) return;
              useUI.getState().copyTableToClipboard(table);
              useUI.getState().toast(t("widgets.tableCopied"), "success");
            })}
          {item("front", <ArrowUpToLine size={15} />, t("month.bringToFront"), () =>
            s().raiseWidgets(monthIndex, ids),
          )}
          {item("back", <ArrowDownToLine size={15} />, t("month.sendToBack"), () => {
            // "Send to back" is everything else brought forward over this one.
            const month = s().doc.projects.find((p) => p.id === s().doc.currentProjectId)?.months[
              monthIndex
            ];
            if (!month) return;
            const rest = [...month.tables, ...month.charts]
              .map((w) => w.id)
              .filter((id) => !ids.includes(id));
            s().raiseWidgets(monthIndex, rest);
          })}
          <span className={styles.sep} />
          {item(
            "del",
            <Trash2 size={15} />,
            many ? t("month.deleteSelected", { count: ids.length }) : t("widgets.deleteTable"),
            () => {
              s().removeWidgets(monthIndex, ids);
              clearSelection();
            },
            true,
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
