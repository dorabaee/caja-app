import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
}

export function Cell({ type, value, note, r, c, onCommit, onNote, onEnter, recurring }: CellProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

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
      <div className={styles.cell}>
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
    <div className={styles.cell}>
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
    </div>
  );
}
