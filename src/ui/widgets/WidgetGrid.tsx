import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Copy,
  Trash2,
  Repeat,
  EyeOff,
  Settings2,
  Maximize2,
  GripVertical,
  GripHorizontal,
} from "lucide-react";
import type { Column, ColumnType, Row, Table } from "@core/model/types";
import { recurringDefIdFromRowId } from "@core/compute";
import { MIN_COLUMN_WIDTH } from "@core/model/defaults";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, Popover, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useListReorder } from "@ui/hooks/useListReorder";
import type { WidgetMode } from "@ui/hooks/useTableMode";
import { Cell } from "./cells/Cell";
import { CategoryTag } from "./cells/CategoryTag";
import styles from "./widget.module.css";

const TYPE_KEY = { text: "widgets.typeText", money: "widgets.typeMoney", date: "widgets.typeDate" } as const;

/** Columns carry their own reorder attribute: `querySelectorAll` walks descendants, so a
 *  row drag scanning the grid would otherwise sweep up the header cells too. */
const COLUMN_REORDER_ATTR = "data-reorder-col-id";

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

export interface GridModeProps {
  /** Drives the read-only overlays: "reorder" locks everything but the row grips, and
   *  "columns" locks everything but the headers (which become delete targets). */
  mode?: WidgetMode;
  /** Draft row order while reordering (row ids); null = the table's own order. */
  rowOrder?: string[] | null;
  onRowOrderChange?: (orderedIds: string[]) => void;
  /** Draft column order while reordering (column ids); null = the table's own order. */
  columnOrder?: string[] | null;
  onColumnOrderChange?: (orderedIds: string[]) => void;
  /** Columns staged for deletion, applied only when the user confirms. */
  pendingDeletes?: ReadonlySet<string>;
  canStageMore?: boolean;
  onStageDelete?: (columnId: string) => void;
  onUnstageDelete?: (columnId: string) => void;
}

/** The scrollable header + data rows shared by table and ledger widgets. */
export function WidgetGrid({
  monthIndex,
  table,
  roleColors,
  recurringRows,
  footer,
  mode = "idle",
  rowOrder,
  onRowOrderChange,
  columnOrder,
  onColumnOrderChange,
  pendingDeletes,
  canStageMore = true,
  onStageDelete,
  onUnstageDelete,
}: {
  monthIndex: number;
  table: Table;
  roleColors?: boolean;
  /** Read-time recurring rows to append after the stored rows (muted, override-on-edit). */
  recurringRows?: Row[];
  /** Sticky bottom row rendered inside the grid so it shares column widths + horizontal
   *  scroll with the header/body (e.g. the table total). Inherits `--cols`. */
  footer?: ReactNode;
} & GridModeProps) {
  const { t } = useTranslation();
  const s = useStore.getState; // actions are stable; call s().action(...) (no subscription)
  const send = useUI((u) => u.sendValue); // #7 send-a-value flow (highlights destinations)
  const project = useCurrentProject();
  const categories = project?.categories ?? [];
  const categoryColumn = table.columns.find((c) => c.category) ?? null; // #14 row tag target
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ r: number; c: number } | null>(null);
  // Column the pointer is over in "columns" mode — tints the whole column, which CSS
  // can't express on its own (a flat grid has no "nth cell of every row" selector).
  const [dangerIndex, setDangerIndex] = useState<number | null>(null);

  const editing = mode !== "idle";
  const reordering = mode === "reorder";

  const rows = useMemo(() => {
    if (!rowOrder) return table.rows;
    const byId = new Map(table.rows.map((r) => [r.id, r]));
    const ordered = rowOrder.map((rid) => byId.get(rid)).filter((r): r is Row => !!r);
    for (const r of table.rows) if (!rowOrder.includes(r.id)) ordered.push(r);
    return ordered;
  }, [table.rows, rowOrder]);

  // Cells are keyed by column id, so the draft order only changes what's drawn where —
  // the values stay bound to their own column all the way through a reorder.
  const columns = useMemo(() => {
    if (!columnOrder) return table.columns;
    const byId = new Map(table.columns.map((c) => [c.id, c]));
    const ordered = columnOrder.map((cid) => byId.get(cid)).filter((c): c is Column => !!c);
    for (const c of table.columns) if (!columnOrder.includes(c.id)) ordered.push(c);
    return ordered;
  }, [table.columns, columnOrder]);

  const reorder = useListReorder((ids) => onRowOrderChange?.(ids));
  const colReorder = useListReorder((ids) => onColumnOrderChange?.(ids), {
    axis: "x",
    attr: COLUMN_REORDER_ATTR,
  });

  useEffect(() => {
    if (!editing) setDangerIndex(null);
  }, [editing]);

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
    if (r < rows.length - 1) focusCell(r + 1, c);
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
      gridEl?.style.setProperty("--cols", gridTemplate(columns, { [col.id]: next }));
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
      <div className={styles.grid} ref={gridRef} style={gridStyleFor(columns)}>
        <div className={styles.headRow}>
          {columns.map((col, ci) => (
            <ColumnHeader
              key={col.id}
              monthIndex={monthIndex}
              tableId={table.id}
              column={col}
              canDelete={columns.length > 1}
              roleColors={roleColors}
              onResize={mode === "idle" ? startResize : undefined}
              mode={mode}
              onGrip={(e) => colReorder.start(e, col.id)}
              dragging={colReorder.dragId === col.id}
              dropTarget={colReorder.overId === col.id}
              staged={!!pendingDeletes?.has(col.id)}
              canStage={canStageMore}
              onStage={() => onStageDelete?.(col.id)}
              onUnstage={() => onUnstageDelete?.(col.id)}
              onHover={(over) =>
                setDangerIndex((prev) => (over ? ci : prev === ci ? null : prev))
              }
            />
          ))}
          <div className={styles.headCell} aria-hidden />
        </div>

        {rows.map((row, ri) => (
          <div
            className={cn(
              styles.row,
              reordering && styles.rowReorder,
              reorder.dragId === row.id && styles.rowDragging,
              reorder.overId === row.id && styles.rowDropTarget,
            )}
            key={row.id}
            data-reorder-id={reordering ? row.id : undefined}
          >
            {columns.map((col, ci) => {
              const cellVal = row.cells[col.id] ?? "";
              const sendKey = `${table.id}:${row.id}:${col.id}`;
              const sendable = !editing && col.type === "money" && !!cellVal.trim() && !send;
              const receiving =
                !editing && !!send && col.type === "money" && send.sourceKey !== sendKey;
              const staged = !!pendingDeletes?.has(col.id);
              return (
                <Cell
                  key={col.id}
                  type={col.type}
                  value={cellVal}
                  note={row.notes?.[col.id] ?? ""}
                  r={ri}
                  c={ci}
                  disabled={editing}
                  tag={
                    categoryColumn?.id === col.id ? (
                      <CategoryTag
                        value={cellVal}
                        categories={categories}
                        preferredGroup={table.fiscal ? "fiscal" : "noFiscal"}
                        onSelect={(name) =>
                          s().setCell(monthIndex, table.id, row.id, col.id, name)
                        }
                        onCreate={(name, group) => {
                          const pid = s().doc.currentProjectId;
                          if (pid)
                            s().updateProject(pid, { categories: [...categories, { name, group }] });
                          s().setCell(monthIndex, table.id, row.id, col.id, name);
                        }}
                        onClear={() => s().setCell(monthIndex, table.id, row.id, col.id, "")}
                      />
                    ) : undefined
                  }
                  danger={mode === "columns" && dangerIndex === ci && !staged}
                  staged={mode === "columns" && staged}
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
              {reordering ? (
                <span
                  className={styles.rowGrip}
                  title={t("widgets.dragRow")}
                  aria-label={t("widgets.dragRow")}
                  onPointerDown={(e) => reorder.start(e, row.id)}
                >
                  <GripVertical size={15} aria-hidden />
                </span>
              ) : (
                !editing && (
                  <>
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
                      <MenuItem
                        icon={<Copy />}
                        onClick={() => s().duplicateRow(monthIndex, table.id, row.id)}
                      >
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
                  </>
                )
              )}
            </div>
          </div>
        ))}

        {recurringRows?.map((row, ri) => (
          <RecurringRow
            key={row.id}
            monthIndex={monthIndex}
            table={table}
            columns={columns}
            row={row}
            r={rows.length + ri}
            disabled={editing}
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
  columns,
  row,
  r,
  disabled,
}: {
  monthIndex: number;
  table: Table;
  columns: Column[];
  row: Row;
  r: number;
  disabled?: boolean;
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
      {columns.map((col, ci) => (
        <Cell
          key={col.id}
          type={col.type}
          value={row.cells[col.id] ?? ""}
          note=""
          r={r}
          c={ci}
          recurring
          disabled={disabled}
          onCommit={(v) => override(col, v)}
          onNote={() => {}}
          onEnter={() => {}}
        />
      ))}
      <div className={styles.actionsCell}>
        {!disabled && (
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
        )}
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
  mode,
  staged,
  canStage,
  onStage,
  onUnstage,
  onHover,
  onGrip,
  dragging,
  dropTarget,
}: {
  monthIndex: number;
  tableId: string;
  column: Column;
  canDelete: boolean;
  roleColors?: boolean;
  onResize?: (e: ReactPointerEvent<HTMLElement>, column: Column) => void;
  mode: WidgetMode;
  staged: boolean;
  canStage: boolean;
  onStage: () => void;
  onUnstage: () => void;
  onHover: (over: boolean) => void;
  onGrip: (e: ReactPointerEvent<HTMLElement>) => void;
  dragging: boolean;
  dropTarget: boolean;
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

  // "reorder" mode: the header becomes a grip you drag sideways to move the whole column
  // (values included — cells are keyed by column id, not by position).
  if (mode === "reorder") {
    return (
      <div
        className={cn(
          styles.headCell,
          styles.headCellReorder,
          dragging && styles.headCellDragging,
          dropTarget && styles.headCellDropTarget,
        )}
        {...{ [COLUMN_REORDER_ATTR]: column.id }}
      >
        <span
          className={styles.colGrip}
          title={t("widgets.dragColumn")}
          aria-label={t("widgets.dragColumn")}
          onPointerDown={onGrip}
        >
          <GripHorizontal size={14} aria-hidden />
          <span className={cn(styles.colGripName, roleClass)}>{column.name}</span>
        </span>
      </div>
    );
  }

  // "columns" mode: the whole header becomes the delete target, so the rename input and
  // the type menu step aside for a single confirm-on-click button.
  if (mode === "columns") {
    return (
      <div
        className={cn(styles.headCell, styles.headCellEditing, staged && styles.headCellStaged)}
        onPointerEnter={() => !staged && onHover(true)}
        onPointerLeave={() => onHover(false)}
      >
        {staged ? (
          <button type="button" className={styles.colStagedBtn} onClick={onUnstage}>
            <Trash2 size={13} aria-hidden />
            <span className={styles.colStagedName}>{column.name}</span>
            <span className={styles.colUndo}>{t("widgets.undoDelete")}</span>
          </button>
        ) : (
          <Popover
            align="start"
            minWidth={248}
            className={styles.confirmPop}
            onOpenChange={(open) => {
              if (!open) onHover(false);
            }}
            trigger={
              <button type="button" className={styles.colDangerBtn} disabled={!canStage}>
                {column.name}
              </button>
            }
          >
            {({ close }) => (
              <div className={styles.confirmPanel}>
                <p className={styles.confirmText}>{t("widgets.confirmDeleteColumn")}</p>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    className={styles.confirmNo}
                    onClick={() => {
                      onHover(false);
                      close();
                    }}
                  >
                    {t("common.no")}
                  </button>
                  <button
                    type="button"
                    className={styles.confirmYes}
                    onClick={() => {
                      onStage();
                      onHover(false);
                      close();
                    }}
                  >
                    {t("common.yes")}
                  </button>
                </div>
              </div>
            )}
          </Popover>
        )}
      </div>
    );
  }

  const locked = mode !== "idle";

  return (
    <div className={styles.headCell}>
      <input
        className={cn(styles.colInput, column.type === "money" && styles.colInputRight, roleClass)}
        value={name}
        disabled={locked}
        aria-label={t("widgets.columnName")}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setName(column.name);
        }}
      />
      {!locked && (
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
      )}
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
