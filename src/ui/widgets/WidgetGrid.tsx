import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Copy, Trash2, Repeat, EyeOff, Settings2, Maximize2 } from "lucide-react";
import type { Column, ColumnType, Row, Table } from "@core/model/types";
import { recurringDefIdFromRowId } from "@core/compute";
import { MIN_COLUMN_WIDTH } from "@core/model/defaults";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { Cell } from "./cells/Cell";
import { CategoryTag } from "./cells/CategoryTag";
import styles from "./widget.module.css";

const TYPE_KEY = { text: "widgets.typeText", money: "widgets.typeMoney", date: "widgets.typeDate" } as const;

export function gridTemplate(columns: Column[], widths?: Record<string, number>): string {
  // A user-set width pins the column (px); otherwise low minima let it flex down to the
  // widget width (fit-to-width), and below the sum of minima the grid scrolls instead of
  // clipping (#2). `widths` overrides per-column for live drag-resize preview.
  const parts: string[] = columns.map((c) => {
    const w = widths?.[c.id] ?? c.width;
    if (w != null) return `${Math.max(MIN_COLUMN_WIDTH, w)}px`;
    return c.type === "money"
      ? "minmax(84px, 1fr)"
      : c.type === "date"
        ? "minmax(116px, 150px)"
        : "minmax(96px, 1.6fr)";
  });
  parts.push("64px"); // row-actions column (tag + row menu)
  return parts.join(" ");
}

export function gridStyleFor(columns: Column[], widths?: Record<string, number>): CSSProperties {
  return { "--cols": gridTemplate(columns, widths) } as CSSProperties;
}

/** The scrollable header + data rows shared by table and ledger widgets. */
export function WidgetGrid({
  monthIndex,
  table,
  roleColors,
  recurringRows,
  footer,
}: {
  monthIndex: number;
  table: Table;
  roleColors?: boolean;
  /** Read-time recurring rows to append after the stored rows (muted, override-on-edit). */
  recurringRows?: Row[];
  /** Sticky bottom row rendered inside the grid so it shares column widths + horizontal
   *  scroll with the header/body (e.g. the table total). Inherits `--cols`. */
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const s = useStore.getState; // actions are stable; call s().action(...) (no subscription)
  const send = useUI((u) => u.sendValue); // #7 send-a-value flow (highlights destinations)
  const project = useCurrentProject();
  const categories = project?.categories ?? [];
  const categoryColumn = table.columns.find((c) => c.category) ?? null; // #14 row tag target
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

  // Drag-resize a column. We mutate the grid's `--cols` variable directly during the
  // drag (no React re-render per pointermove — smooth even on long tables) and commit
  // the final width to the store on release, which re-renders from `col.width`.
  const startResize = (e: ReactPointerEvent<HTMLElement>, col: Column) => {
    e.preventDefault();
    e.stopPropagation();
    const headCell = e.currentTarget.parentElement as HTMLElement | null;
    const startW = headCell?.getBoundingClientRect().width ?? col.width ?? 120;
    const startX = e.clientX;
    const gridEl = gridRef.current;
    let next = startW;
    const onMove = (ev: PointerEvent) => {
      next = Math.max(MIN_COLUMN_WIDTH, Math.round(startW + (ev.clientX - startX)));
      gridEl?.style.setProperty("--cols", gridTemplate(table.columns, { [col.id]: next }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      s().setColumnWidth(monthIndex, table.id, col.id, next);
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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
              onResize={startResize}
            />
          ))}
          <div className={styles.headCell} aria-hidden />
        </div>

        {table.rows.map((row, ri) => (
          <div className={styles.row} key={row.id}>
            {table.columns.map((col, ci) => {
              const cellVal = row.cells[col.id] ?? "";
              const sendKey = `${table.id}:${row.id}:${col.id}`;
              const sendable = col.type === "money" && !!cellVal.trim() && !send;
              const receiving = !!send && col.type === "money" && send.sourceKey !== sendKey;
              return (
                <Cell
                  key={col.id}
                  type={col.type}
                  value={cellVal}
                  note={row.notes?.[col.id] ?? ""}
                  r={ri}
                  c={ci}
                  onCommit={(v) => s().setCell(monthIndex, table.id, row.id, col.id, v)}
                  onNote={(n) => s().setNote(monthIndex, table.id, row.id, col.id, n)}
                  onEnter={() => onEnter(ri, ci)}
                  sendable={sendable}
                  onSend={() => useUI.getState().startSendValue(cellVal, sendKey)}
                  receiving={receiving}
                  onReceive={() => {
                    s().setCell(monthIndex, table.id, row.id, col.id, send!.value);
                    useUI.getState().cancelSendValue();
                    useUI.getState().toast(t("widgets.valueSent"), "success");
                  }}
                />
              );
            })}
            <div className={styles.actionsCell}>
              {categoryColumn && (
                <CategoryTag
                  value={row.cells[categoryColumn.id] ?? ""}
                  categories={categories}
                  onSelect={(name) => s().setCell(monthIndex, table.id, row.id, categoryColumn.id, name)}
                  onCreate={(name) => {
                    const pid = s().doc.currentProjectId;
                    if (pid) s().updateProject(pid, { categories: [...categories, name] });
                    s().setCell(monthIndex, table.id, row.id, categoryColumn.id, name);
                  }}
                  onClear={() => s().setCell(monthIndex, table.id, row.id, categoryColumn.id, "")}
                />
              )}
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

        {footer}
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
  onResize,
}: {
  monthIndex: number;
  tableId: string;
  column: Column;
  canDelete: boolean;
  roleColors?: boolean;
  onResize?: (e: ReactPointerEvent<HTMLElement>, column: Column) => void;
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
        {column.width != null && (
          <MenuItem
            icon={<Maximize2 />}
            onClick={() => s().setColumnWidth(monthIndex, tableId, column.id, null)}
          >
            {t("widgets.autoWidth")}
          </MenuItem>
        )}
        <MenuItem
          icon={<Trash2 />}
          danger
          disabled={!canDelete}
          onClick={() => s().removeColumn(monthIndex, tableId, column.id)}
        >
          {t("widgets.deleteColumn")}
        </MenuItem>
      </Menu>
      {onResize && (
        <span
          className={styles.colResize}
          role="separator"
          aria-orientation="vertical"
          title={t("widgets.resizeColumn")}
          onPointerDown={(e) => onResize(e, column)}
        />
      )}
    </div>
  );
}
