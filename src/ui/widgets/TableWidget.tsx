import { memo, useEffect, useState } from "react";
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
  Repeat,
} from "lucide-react";
import type { ColumnType, Table, TableKind } from "@core/model/types";
import { columnTotals } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import { useRecurringRows } from "@ui/hooks/useRecurringRows";
import { WidgetGrid } from "./WidgetGrid";
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
const TYPE_ICON = { text: <Type />, money: <DollarSign />, date: <Calendar /> } as const;
const TYPE_KEY = { text: "widgets.typeText", money: "widgets.typeMoney", date: "widgets.typeDate" } as const;

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
  const selected = useUI((u) => u.selectedWidgetId === table.id);

  const recurringRows = useRecurringRows(monthIndex, table);
  const totals = columnTotals(
    recurringRows.length ? { ...table, rows: [...table.rows, ...recurringRows] } : table,
  );
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
      className={cn(styles.card, fill && styles.cardFill, selected && styles.selected)}
      onMouseDown={() => select(table.id)}
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
        </Menu>
      </div>

      <WidgetGrid
        monthIndex={monthIndex}
        table={table}
        recurringRows={recurringRows}
        footer={
          <div className={styles.totalRow}>
            {table.columns.map((col, i) => (
              <div key={col.id} className={cn(styles.totalCell, col.type === "money" && styles.totalMoney)}>
                {i === 0 ? (
                  <span className={styles.totalLabel}>{t("widgets.total")}</span>
                ) : col.type === "money" ? (
                  fmt.moneyPlain(totals[col.id] ?? 0)
                ) : null}
              </div>
            ))}
            <div className={styles.totalCell} aria-hidden />
          </div>
        }
      />

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
          {(["text", "money", "date"] as ColumnType[]).map((ct) => (
            <MenuItem key={ct} icon={TYPE_ICON[ct]} onClick={() => s().addColumn(monthIndex, table.id, ct)}>
              {t(TYPE_KEY[ct])}
            </MenuItem>
          ))}
        </Menu>
      </div>
    </div>
  );
});
