import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { ColumnType } from "@core/model/types";
import { parseDateCell } from "@core/format/date";
import { cn } from "@ui/common";
import { CellNote } from "./CellNote";
import { DatePicker } from "./DatePicker";
import styles from "../widget.module.css";

/** How a date reads in the cell while you're not editing it. */
function toDisplayDate(raw: string): string {
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
  onCommit: (value: string) => void;
  onNote: (note: string) => void;
  onEnter: () => void;
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
}

export function Cell({
  type,
  value,
  note,
  r,
  c,
  onCommit,
  onNote,
  onEnter,
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
}: CellProps) {
  const { t } = useTranslation();
  const isDate = type === "date";
  const isMoney = type === "money";
  const display = isDate ? toDisplayDate(value) : value;
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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCommit(isDate ? toCellDate(draft) : draft);
      onEnter();
    }
  };

  const cellClass = cn(
    styles.cell,
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
  const actionCount = showActions ? 1 + tagButtons + (isDate ? 1 : 0) + (sendIcon ? 1 : 0) : 0;
  const actions = showActions && (
    <span className={cn(styles.cellActions, isMoney && styles.cellActionsLeft)}>
      {tag}
      {isDate && <DatePicker value={value} onChange={onCommit} />}
      <CellNote note={note} onChange={onNote} />
      {sendIcon}
    </span>
  );

  return (
    <div className={cellClass} style={{ "--cell-actions": actionCount } as CSSProperties}>
      <input
        type="text"
        inputMode={isMoney ? "decimal" : undefined}
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
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          focused.current = false;
          if (isDate) {
            const next = toCellDate(draft);
            setDraft(toDisplayDate(next));
            onCommit(next);
          } else {
            onCommit(draft);
          }
        }}
        onKeyDown={onKeyDown}
      />
      {actions}
      {receiveOverlay}
    </div>
  );
}
