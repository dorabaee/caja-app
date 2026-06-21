import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ColumnType } from "@core/model/types";
import { parseDateCell } from "@core/format/date";
import { cn } from "@ui/common";
import { CellNote } from "./CellNote";
import styles from "../widget.module.css";

function toInputDate(raw: string): string {
  const d = parseDateCell(raw);
  if (!d) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
  sendable,
  onSend,
  receiving,
  onReceive,
}: CellProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  const sendIcon = sendable && onSend && (
    <button
      type="button"
      className={styles.sendBtn}
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
    if (!focused.current) setDraft(value);
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (type !== "date") onCommit(draft);
      onEnter();
    }
  };

  const noteSide = type === "money" ? styles.noteLeft : styles.noteRight;

  if (type === "date") {
    return (
      <div className={cn(styles.cell, receiving && styles.cellReceiving)}>
        <input
          type="date"
          className={cn(styles.input, styles.inputDate, recurring && styles.inputRecurring)}
          data-r={r}
          data-c={c}
          value={toInputDate(value)}
          onChange={(e) => onCommit(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {!recurring && <CellNote note={note} onChange={onNote} side={noteSide} />}
      </div>
    );
  }

  const isMoney = type === "money";
  return (
    <div className={cn(styles.cell, receiving && styles.cellReceiving)}>
      <input
        type="text"
        inputMode={isMoney ? "decimal" : undefined}
        className={cn(styles.input, isMoney && styles.inputMoney, recurring && styles.inputRecurring)}
        placeholder={isMoney ? "0.00" : ""}
        data-r={r}
        data-c={c}
        value={draft}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          focused.current = false;
          onCommit(draft);
        }}
        onKeyDown={onKeyDown}
      />
      {!recurring && <CellNote note={note} onChange={onNote} side={noteSide} />}
      {sendIcon}
      {receiveOverlay}
    </div>
  );
}
