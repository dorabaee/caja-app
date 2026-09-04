import { memo, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  GripVertical,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Type,
  DollarSign,
  Calendar,
  Copy,
  ClipboardCopy,
  Trash2,
  Tags,
  Tag,
  Repeat,
} from "lucide-react";
import type { ColumnType, Table, TableKind } from "@core/model/types";
import { columnTotals } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import { useRecurringRows } from "@ui/hooks/useRecurringRows";
import { useTableMode } from "@ui/hooks/useTableMode";
import { WidgetGrid } from "./WidgetGrid";
import { BankTag } from "./cells/BankTag";
import { ModeActions, TableModeMenuItems, TableSortMenu } from "./TableFiscal";
import { DRAG_HANDLE } from "./dragHandle";
import styles from "./widget.module.css";

const KIND_KEY: Record<Exclude<TableKind, "ledger">, string> = {
  income: "widgets.kindIncome",
  expense: "widgets.kindExpense",
  none: "widgets.kindNone",
};
const KIND_DOT: Record<Exclude<TableKind, "ledger">, string> = {
  income: styles.dotIncome,
  expense: styles.dotExpense,
  none: styles.dotNone,
};
const TYPE_ICON: Record<ColumnType, ReactNode> = {
  text: <Type />,
  money: <DollarSign />,
  date: <Calendar />,
  category: <Tag />,
};
const TYPE_KEY: Record<ColumnType, string> = {
  text: "widgets.typeText",
  money: "widgets.typeMoney",
  date: "widgets.typeDate",
  category: "widgets.typeCategory",
};

export const TableWidget = memo(function TableWidget({
  monthIndex,
  table,
  fill,
}: {
  monthIndex: number;
  table: Table;
  fill?: boolean;
}) {
  const { t } = useTranslation();
  const s = useStore.getState; // actions are stable; call s().action(...) without subscribing
  const fmt = useFormat();
  const select = useUI((u) => u.select);
  const openModal = useUI((u) => u.openModal);
  const selected = useUI((u) => u.selectedIds.has(table.id));

  const mode = useTableMode(monthIndex, table);
  const recurringRows = useRecurringRows(monthIndex, table);
  const totals = columnTotals(
    recurringRows.length ? { ...table, rows: [...table.rows, ...recurringRows] } : table,
  );
  // The "Total" word stays where it reads — at the head of the row — and only when that
  // first column has no figure to lose. Delete "Fecha" and BANCOS becomes column 0: the
  // label steps out of the grid rather than overwrite a total or drift to the far right,
  // and the footer carries it instead.
  const showRowLabel = table.columns[0]?.type !== "money";
  const [title, setTitle] = useState(table.title);
  useEffect(() => setTitle(table.title), [table.title]);

  const commitTitle = () => {
    const next = title.trim() || t("widgets.untitledTable");
    if (next !== table.title) s().setTableTitle(monthIndex, table.id, next);
    setTitle(next);
  };

  const kind = (table.kind === "ledger" ? "none" : table.kind) as Exclude<TableKind, "ledger">;

  return (
    <div
      className={cn(
        styles.card,
        fill && styles.cardFill,
        selected && styles.selected,
        mode.mode !== "idle" && styles.cardEditing,
      )}
      onPointerDownCapture={(e) => {
        // Modifier clicks and clicks inside an existing multi-selection belong to the
        // canvas (toggle / group drag); a plain click on an unselected widget selects it.
        if (e.ctrlKey || e.metaKey || e.shiftKey || selected) return;
        select(table.id);
      }}
    >
      <div className={styles.whead}>
        <span className={cn(styles.handle, DRAG_HANDLE)} title={t("widgets.move")} aria-hidden>
          <GripVertical size={16} />
        </span>
        <input
          className={styles.titleInput}
          value={title}
          aria-label={t("widgets.tableTitle")}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setTitle(table.title);
          }}
        />

        {table.fiscal && <BankTag bank={table.bank} />}
        <ModeActions mode={mode} />
        {mode.mode === "idle" && <TableSortMenu monthIndex={monthIndex} table={table} />}

        {mode.mode === "idle" && (
        <Menu
          align="end"
          trigger={
            <button type="button" className={styles.kindBtn}>
              <span className={cn(styles.dot, KIND_DOT[kind])} aria-hidden />
              {t(KIND_KEY[kind])}
              <ChevronDown size={14} className={styles.kindCaret} aria-hidden />
            </button>
          }
        >
          <MenuItem checked={kind === "income"} onClick={() => s().setTableKind(monthIndex, table.id, "income")}>
            {t("widgets.kindIncome")}
          </MenuItem>
          <MenuItem checked={kind === "expense"} onClick={() => s().setTableKind(monthIndex, table.id, "expense")}>
            {t("widgets.kindExpense")}
          </MenuItem>
          <MenuItem checked={kind === "none"} onClick={() => s().setTableKind(monthIndex, table.id, "none")}>
            {t("widgets.kindNone")}
          </MenuItem>
        </Menu>
        )}

        {mode.mode === "idle" && (
        <Menu align="end" trigger={<IconButton label={t("widgets.tableOptions")} icon={<MoreHorizontal />} size="sm" />}>
          <MenuLabel>{t("widgets.addColumn")}</MenuLabel>
          <MenuItem icon={<Type />} onClick={() => s().addColumn(monthIndex, table.id, "text")}>
            {t("widgets.typeText")}
          </MenuItem>
          <MenuItem icon={<DollarSign />} onClick={() => s().addColumn(monthIndex, table.id, "money")}>
            {t("widgets.typeMoney")}
          </MenuItem>
          <MenuItem icon={<Calendar />} onClick={() => s().addColumn(monthIndex, table.id, "date")}>
            {t("widgets.typeDate")}
          </MenuItem>
          <MenuItem icon={<Tag />} onClick={() => s().addColumn(monthIndex, table.id, "category")}>
            {t("widgets.typeCategory")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Tags />} onClick={() => openModal("categories", table.id)}>
            {t("widgets.categories")}
          </MenuItem>
          <MenuItem icon={<Repeat />} onClick={() => openModal("recurring", table.id)}>
            {t("widgets.recurringEntries")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<ClipboardCopy />}
            onClick={() => {
              useUI.getState().copyTableToClipboard(table);
              useUI.getState().toast(t("widgets.tableCopied"), "success");
            }}
          >
            {t("widgets.copyTable")}
          </MenuItem>
          <MenuItem
            icon={<Copy />}
            onClick={() => {
              const newId = s().duplicateTable(monthIndex, table.id);
              select(newId);
              useUI.getState().toast(t("widgets.tableDuplicated"), "success");
            }}
          >
            {t("widgets.duplicateTable")}
          </MenuItem>
          <MenuItem icon={<Trash2 />} danger onClick={() => s().removeTable(monthIndex, table.id)}>
            {t("widgets.deleteTable")}
          </MenuItem>
          <TableModeMenuItems monthIndex={monthIndex} table={table} mode={mode} />
        </Menu>
        )}
      </div>

      <WidgetGrid
        monthIndex={monthIndex}
        table={table}
        recurringRows={recurringRows}
        mode={mode.mode}
        rowOrder={mode.rowOrder}
        onRowOrderChange={mode.setRowOrder}
        columnOrder={mode.columnOrder}
        onColumnOrderChange={mode.setColumnOrder}
        pendingDeletes={mode.pendingDeletes}
        canStageMore={mode.canStageMore}
        onStageDelete={mode.stageDelete}
        onUnstageDelete={mode.unstageDelete}
        footer={
          <div className={styles.totalRow}>
            {table.columns.map((col, i) => (
              <div
                key={col.id}
                className={cn(
                  styles.totalCell,
                  col.type === "money" && styles.totalMoney,
                  col.type === "money" && styles[`totalMoney_${kind}`],
                )}
              >
                {col.type === "money" ? (
                  fmt.moneyPlain(totals[col.id] ?? 0)
                ) : i === 0 && showRowLabel ? (
                  <span className={styles.totalLabel}>{t("widgets.total")}</span>
                ) : null}
              </div>
            ))}
            <div className={styles.totalCell} aria-hidden />
          </div>
        }
      />

      {mode.mode === "idle" && (
      <div className={styles.wfoot}>
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => s().addRow(monthIndex, table.id)}>
          {t("widgets.addRow")}
        </Button>
        <Menu
          trigger={
            <Button variant="ghost" size="sm" icon={<Plus />}>
              {t("widgets.addColumn")}
            </Button>
          }
        >
          {(["text", "money", "date", "category"] as ColumnType[]).map((ct) => (
            <MenuItem key={ct} icon={TYPE_ICON[ct]} onClick={() => s().addColumn(monthIndex, table.id, ct)}>
              {t(TYPE_KEY[ct])}
            </MenuItem>
          ))}
        </Menu>
      </div>
      )}
    </div>
  );
});
