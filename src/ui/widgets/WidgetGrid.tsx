import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Copy, Trash2, Repeat, EyeOff, Settings2 } from "lucide-react";
import type { Column, ColumnType, Row, Table } from "@core/model/types";
import { recurringDefIdFromRowId } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { Cell } from "./cells/Cell";
import { RowAttachments } from "./cells/RowAttachments";
import styles from "./widget.module.css";

const TYPE_KEY = { text: "widgets.typeText", money: "widgets.typeMoney", date: "widgets.typeDate" } as const;

export function gridTemplate(columns: Column[]): string {
  const parts: string[] = columns.map((c) =>
    c.type === "money"
      ? "minmax(110px, 1fr)"
      : c.type === "date"
        ? "minmax(132px, 160px)"
        : "minmax(132px, 1.5fr)",
  );
  parts.push("76px"); // row-actions column (attachments + row menu)
  return parts.join(" ");
}

export function gridStyleFor(columns: Column[]): CSSProperties {
  return { "--cols": gridTemplate(columns) } as CSSProperties;
}

/** The scrollable header + data rows shared by table and ledger widgets. */
export function WidgetGrid({
  monthIndex,
  table,
  roleColors,
  recurringRows,
}: {
  monthIndex: number;
  table: Table;
  roleColors?: boolean;
  /** Read-time recurring rows to append after the stored rows (muted, override-on-edit). */
  recurringRows?: Row[];
}) {
  const { t } = useTranslation();
  const s = useStore.getState; // actions are stable; call s().action(...) (no subscription)
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ r: number; c: number } | null>(null);

  const focusCell = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-r="${r}"][data-c="${c}"]`);
    if (!el) return;
    el.focus();
    try {
      el.select();
    } catch {
      /* date inputs don't support select() */
    }
  };

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { r, c } = pendingFocus.current;
    pendingFocus.current = null;
    focusCell(r, c);
  });

  const onEnter = (r: number, c: number) => {
    if (r < table.rows.length - 1) focusCell(r + 1, c);
    else {
      pendingFocus.current = { r: r + 1, c };
      s().addRow(monthIndex, table.id);
    }
  };

  return (
    <div className={styles.scroll}>
      <div className={styles.grid} ref={gridRef} style={gridStyleFor(table.columns)}>
        <div className={styles.headRow}>
          {table.columns.map((col) => (
            <ColumnHeader
              key={col.id}
              monthIndex={monthIndex}
              tableId={table.id}
              column={col}
              canDelete={table.columns.length > 1}
              roleColors={roleColors}
            />
          ))}
          <div className={styles.headCell} aria-hidden />
        </div>

        {table.rows.map((row, ri) => (
          <div className={styles.row} key={row.id}>
            {table.columns.map((col, ci) => (
              <Cell
                key={col.id}
                type={col.type}
                value={row.cells[col.id] ?? ""}
                note={row.notes?.[col.id] ?? ""}
                r={ri}
                c={ci}
                onCommit={(v) => s().setCell(monthIndex, table.id, row.id, col.id, v)}
                onNote={(n) => s().setNote(monthIndex, table.id, row.id, col.id, n)}
                onEnter={() => onEnter(ri, ci)}
              />
            ))}
            <div className={styles.actionsCell}>
              <RowAttachments
                monthIndex={monthIndex}
                tableId={table.id}
                rowId={row.id}
                attachments={row.attachments ?? []}
              />
              <Menu
                align="end"
                trigger={
                  <IconButton
                    label={t("widgets.rowOptions")}
                    icon={<Trash2 />}
                    size="sm"
                    className={styles.actionBtn}
                  />
                }
              >
                <MenuItem icon={<Copy />} onClick={() => s().duplicateRow(monthIndex, table.id, row.id)}>
                  {t("widgets.duplicateRow")}
                </MenuItem>
                <MenuItem
                  icon={<Trash2 />}
                  danger
                  onClick={() => s().removeRow(monthIndex, table.id, row.id)}
                >
                  {t("widgets.deleteRow")}
                </MenuItem>
              </Menu>
            </div>
          </div>
        ))}

        {recurringRows?.map((row, ri) => (
          <RecurringRow
            key={row.id}
            monthIndex={monthIndex}
            table={table}
            row={row}
            r={table.rows.length + ri}
          />
        ))}
      </div>
    </div>
  );
}

/** A read-time recurring occurrence: muted cells; edits write a per-month override. */
function RecurringRow({
  monthIndex,
  table,
  row,
  r,
}: {
  monthIndex: number;
  table: Table;
  row: Row;
  r: number;
}) {
  const { t } = useTranslation();
  const s = useStore.getState;
  const openModal = useUI((u) => u.openModal);
  const defId = recurringDefIdFromRowId(row.id);

  const override = (col: Column, value: string) => {
    const pid = s().doc.currentProjectId;
    if (pid && defId) s().setRecurringOverrideCell(pid, defId, monthIndex, col.name, value);
  };
  const skip = () => {
    const pid = s().doc.currentProjectId;
    if (pid && defId) s().skipRecurringOccurrence(pid, defId, monthIndex, true);
  };

  return (
    <div className={cn(styles.row, styles.recurringRow)} title={t("widgets.recurringRow")}>
      {table.columns.map((col, ci) => (
        <Cell
          key={col.id}
          type={col.type}
          value={row.cells[col.id] ?? ""}
          note=""
          r={r}
          c={ci}
          recurring
          onCommit={(v) => override(col, v)}
          onNote={() => {}}
          onEnter={() => {}}
        />
      ))}
      <div className={styles.actionsCell}>
        <Menu
          align="end"
          trigger={
            <IconButton
              label={t("widgets.recurringRowOptions")}
              icon={<Repeat />}
              size="sm"
              className={styles.recurringBtn}
            />
          }
        >
          <MenuLabel>{t("widgets.recurringRow")}</MenuLabel>
          <MenuItem icon={<Settings2 />} onClick={() => openModal("recurring", table.id)}>
            {t("widgets.editSeries")}
          </MenuItem>
          <MenuItem icon={<EyeOff />} onClick={skip}>
            {t("widgets.skipThisMonth")}
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}

function ColumnHeader({
  monthIndex,
  tableId,
  column,
  canDelete,
  roleColors,
}: {
  monthIndex: number;
  tableId: string;
  column: Column;
  canDelete: boolean;
  roleColors?: boolean;
}) {
  const { t } = useTranslation();
  const s = useStore.getState;
  const [name, setName] = useState(column.name);
  useEffect(() => setName(column.name), [column.name]);

  const commit = () => {
    const next = name.trim() || t("widgets.columnDefaultName");
    if (next !== column.name) s().renameColumn(monthIndex, tableId, column.id, next);
    setName(next);
  };

  const roleClass =
    roleColors && column.type === "money"
      ? column.role === "withdrawal"
        ? styles.colMoneyWithdrawal
        : styles.colMoneyDeposit
      : undefined;

  return (
    <div className={styles.headCell}>
      <input
        className={cn(styles.colInput, column.type === "money" && styles.colInputRight, roleClass)}
        value={name}
        aria-label={t("widgets.columnName")}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setName(column.name);
        }}
      />
      <Menu
        align="end"
        trigger={
          <IconButton
            label={t("widgets.columnOptions")}
            icon={<ChevronDown />}
            size="sm"
            className={styles.colMenu}
          />
        }
      >
        <MenuLabel>{t("widgets.columnType")}</MenuLabel>
        {(["text", "money", "date"] as ColumnType[]).map((ct) => (
          <MenuItem
            key={ct}
            checked={column.type === ct}
            onClick={() => s().setColumnType(monthIndex, tableId, column.id, ct)}
          >
            {t(TYPE_KEY[ct])}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem
          icon={<Trash2 />}
          danger
          disabled={!canDelete}
          onClick={() => s().removeColumn(monthIndex, tableId, column.id)}
        >
          {t("widgets.deleteColumn")}
        </MenuItem>
      </Menu>
    </div>
  );
}
