import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CalendarDays, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { ColumnType } from "@core/model/types";
import { parseDateCell } from "@core/format/date";
import { normalizeTextCell } from "@core/format/text";
import { cn } from "@ui/common";
import { useStore } from "@core/store";
import { CellNote } from "./CellNote";
import { DatePicker } from "./DatePicker";
import styles from "../widget.module.css";

/** A table belongs to one month, so cells show the useful part of a chosen date: its day. */
function toDisplayDate(raw: string): string {
  const d = parseDateCell(raw);
  return d ? format(d, "d") : raw;
}

/** Keep the full date available when a user edits the compact day-only display. */
function toEditableDate(raw: string): string {
  const d = parseDateCell(raw);
  return d ? format(d, "dd/MM/yyyy") : raw;
}

/** What a typed date is normalised to on commit — the format the cell stores. */
function toCellDate(typed: string): string {
  const s = typed.trim();
  if (!s) return "";
  const d = parseDateCell(s);
  return d ? format(d, "yyyy-MM-dd") : s;
}

export interface CellProps {
  type: ColumnType;
  value: string;
  note: string;
  r: number;
  c: number;
  rowId?: string;
  columnId?: string;
  monthIndex: number;
  onCommit: (value: string) => void;
  onNote: (note: string) => void;
  onEnter: () => void;
  onShortcut?: (action: "fillDown" | "fillRight" | "duplicateRow") => void;
  /** Synthetic recurring-row cell: muted, no per-cell note. Edits write a month override. */
  recurring?: boolean;
  /** The widget is in a table-wide mode (reorder / column edit): read-only, no note. */
  disabled?: boolean;
  /** Column edit mode: this cell's column is hovered for deletion (pink/red tint). */
  danger?: boolean;
  /** Column edit mode: this cell's column is staged for deletion. */
  staged?: boolean;
  /** Category picker for the table's category column — sits beside this cell's note. */
  tag?: ReactNode;
  /** How many buttons `tag` renders (it may be a fragment), so the input reserves the
   *  right amount of room. Defaults to 1 when a tag is present. */
  tagCount?: number;
  /** #7: this money cell has a value that can be "sent" to another cell. */
  sendable?: boolean;
  onSend?: () => void;
  /** #7: a "send a value" flow is active and this cell is an eligible destination. */
  receiving?: boolean;
  onReceive?: () => void;
  /** Live bounded-fill preview drawn by the parent grid. */
  fillTone?: "source" | "range" | "end";
}

export function Cell({
  type,
  value,
  note,
  r,
  c,
  rowId,
  columnId,
  monthIndex,
  onCommit,
  onNote,
  onEnter,
  onShortcut,
  recurring,
  disabled,
  danger,
  staged,
  tag,
  tagCount,
  sendable,
  onSend,
  receiving,
  onReceive,
  fillTone,
}: CellProps) {
  const { t } = useTranslation();
  const isDate = type === "date";
  const isMoney = type === "money";
  const tableDateMode = useStore((s) => s.doc.settings.tableDateMode);
  const uppercaseTextCells = useStore((s) => s.doc.settings.uppercaseTextCells);
  const locale = useStore((s) => s.doc.settings.locale);
  const display = isDate ? toDisplayDate(value) : value;
  const normalize = (next: string) => normalizeTextCell(next, type === "text" && uppercaseTextCells, locale);
  const [draft, setDraft] = useState(display);
  const focused = useRef(false);

  const sendIcon = sendable && onSend && (
    <button
      type="button"
      className={cn(styles.cellBtn, styles.sendBtn)}
      title={t("widgets.sendValue")}
      aria-label={t("widgets.sendValue")}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSend();
      }}
    >
      <Send size={12} aria-hidden />
    </button>
  );
  const receiveOverlay = receiving && onReceive && (
    <button
      type="button"
      className={styles.receiveOverlay}
      title={t("widgets.pasteHere")}
      aria-label={t("widgets.pasteHere")}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onReceive();
      }}
    />
  );

  // Keep the draft in sync with external changes, but never clobber an active edit.
  useEffect(() => {
    if (!focused.current) setDraft(display);
  }, [display]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      if (!isDate || tableDateMode === "typing") onCommit(isDate ? toCellDate(draft) : normalize(draft));
      onShortcut?.(e.shiftKey ? "duplicateRow" : "fillDown");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
      e.preventDefault();
      if (!isDate || tableDateMode === "typing") onCommit(isDate ? toCellDate(draft) : normalize(draft));
      onShortcut?.("fillRight");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCommit(isDate ? toCellDate(draft) : normalize(draft));
      onEnter();
    }
  };

  const cellClass = cn(
    styles.cell,
    fillTone === "source" && styles.cellFillSource,
    fillTone === "range" && styles.cellFillRange,
    fillTone === "end" && styles.cellFillEnd,
    receiving && styles.cellReceiving,
    danger && styles.cellDanger,
    staged && styles.cellStaged,
  );

  // Note, category tag and calendar share one row of equal buttons instead of stacking
  // on top of each other in the corners. Money cells put them on the left so they never
  // cover the figure, which is right-aligned.
  const showActions = !recurring && !disabled;
  // How many buttons the row of actions holds — the input reserves room for exactly that
  // many, so text never runs underneath them.
  const tagButtons = tag ? (tagCount ?? 1) : 0;
  const actionCount = showActions ? 1 + tagButtons + (sendIcon ? 1 : 0) : 0;
  const actions = showActions && (
    <span className={cn(styles.cellActions, isMoney && styles.cellActionsLeft)}>
      {tag}
      <CellNote note={note} onChange={onNote} />
      {sendIcon}
    </span>
  );

  return (
    <div
      className={cellClass}
      style={{ "--cell-actions": actionCount } as CSSProperties}
      data-fill-row={rowId}
      data-fill-col={columnId}
    >
      {isDate && tableDateMode === "calendar" && !disabled ? (
        <DatePicker
          value={value}
          onChange={onCommit}
          initialDate={new Date(new Date().getFullYear(), monthIndex, 1)}
          trigger={
            <button
              type="button"
              className={cn(styles.input, styles.datePickerInput, recurring && styles.inputRecurring)}
              data-r={r}
              data-c={c}
              aria-label={t("widgets.pickDate")}
              onKeyDown={onKeyDown}
            >
              <span>{display || t("widgets.datePlaceholder")}</span>
              <CalendarDays size={13} aria-hidden />
            </button>
          }
        />
      ) : (
        <input
          type="text"
          inputMode={isMoney ? "decimal" : isDate ? "numeric" : undefined}
          className={cn(
            styles.input,
            isMoney && styles.inputMoney,
            isDate && styles.inputDate,
            recurring && styles.inputRecurring,
          )}
          placeholder={isMoney ? "0.00" : isDate ? t("widgets.datePlaceholder") : ""}
          data-r={r}
          data-c={c}
          disabled={disabled}
          value={draft}
          onFocus={() => {
            focused.current = true;
            if (isDate) setDraft(toEditableDate(value));
          }}
          onChange={(e) => setDraft(isMoney || isDate ? e.target.value : normalize(e.target.value))}
          onBlur={() => {
            focused.current = false;
            if (isDate) {
              const next = toCellDate(draft);
              setDraft(toDisplayDate(next));
              onCommit(next);
            } else {
              onCommit(normalize(draft));
            }
          }}
          onKeyDown={onKeyDown}
        />
      )}
      {actions}
      {receiveOverlay}
      {!disabled && !recurring && rowId && columnId && (
        <span className={styles.fillHandle} data-fill-handle aria-hidden />
      )}
    </div>
  );
}
