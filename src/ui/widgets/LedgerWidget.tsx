import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GripVertical,
  MoreHorizontal,
  Plus,
  Landmark,
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
import type { Table } from "@core/model/types";
import { ledgerBalance } from "@core/compute";
import { parseMoney } from "@core/format/money";
import { useStore, useUI } from "@core/store";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import { useTableMode } from "@ui/hooks/useTableMode";
import { WidgetGrid } from "./WidgetGrid";
import { BankTag } from "./cells/BankTag";
import { ModeActions, TableModeMenuItems, TableSortMenu } from "./TableFiscal";
import { DRAG_HANDLE } from "./dragHandle";
import styles from "./widget.module.css";

export const LedgerWidget = memo(function LedgerWidget({
  monthIndex,
  table,
  fill,
}: {
  monthIndex: number;
  table: Table;
  fill?: boolean;
}) {
  const { t } = useTranslation();
  const s = useStore.getState;
  const fmt = useFormat();
  const select = useUI((u) => u.select);
  const openModal = useUI((u) => u.openModal);
  const selected = useUI((u) => u.selectedIds.has(table.id));

  const mode = useTableMode(monthIndex, table);
  const balance = ledgerBalance(table);

  const [title, setTitle] = useState(table.title);
  useEffect(() => setTitle(table.title), [table.title]);
  const commitTitle = () => {
    const next = title.trim() || t("widgets.ledgerDefaultTitle");
    if (next !== table.title) s().setTableTitle(monthIndex, table.id, next);
    setTitle(next);
  };

  const [initial, setInitial] = useState(String(table.initialBalance ?? ""));
  useEffect(() => setInitial(String(table.initialBalance ?? "")), [table.initialBalance]);
  const commitInitial = () => {
    const v = parseMoney(initial);
    if (v !== (table.initialBalance ?? 0)) s().setTableInitialBalance(monthIndex, table.id, v);
  };

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
          aria-label={t("widgets.ledgerTitle")}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setTitle(table.title);
          }}
        />
        {table.bank ? (
          <BankTag bank={table.bank} />
        ) : (
          <span className={styles.pill}>
            <Landmark size={13} aria-hidden />
            {t("widgets.ledgerPill")}
          </span>
        )}
        <ModeActions mode={mode} />
        {mode.mode === "idle" && <TableSortMenu monthIndex={monthIndex} table={table} />}
        {mode.mode === "idle" && (
        <Menu align="end" trigger={<IconButton label={t("widgets.ledgerOptions")} icon={<MoreHorizontal />} size="sm" />}>
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
            {t("widgets.copyLedger")}
          </MenuItem>
          <MenuItem
            icon={<Copy />}
            onClick={() => {
              const newId = s().duplicateTable(monthIndex, table.id);
              select(newId);
              useUI.getState().toast(t("widgets.tableDuplicated"), "success");
            }}
          >
            {t("widgets.duplicateLedger")}
          </MenuItem>
          <MenuItem icon={<Trash2 />} danger onClick={() => s().removeTable(monthIndex, table.id)}>
            {t("widgets.deleteLedger")}
          </MenuItem>
          <TableModeMenuItems monthIndex={monthIndex} table={table} mode={mode} />
        </Menu>
        )}
      </div>

      {mode.mode === "idle" && (
      <div className={styles.ledgerInitial}>
        <label className={styles.ledgerInitialLabel} htmlFor={`saldo-${table.id}`}>
          {t("widgets.monthInitialBalance")}
        </label>
        <span className={styles.ledgerInitialField}>
          <span className={styles.ledgerCurrency} aria-hidden>
            $
          </span>
          <input
            id={`saldo-${table.id}`}
            className={styles.ledgerInitialInput}
            inputMode="decimal"
            placeholder="0.00"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            onBlur={commitInitial}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </span>
      </div>
      )}

      <WidgetGrid
        monthIndex={monthIndex}
        table={table}
        roleColors
        mode={mode.mode}
        rowOrder={mode.rowOrder}
        onRowOrderChange={mode.setRowOrder}
        columnOrder={mode.columnOrder}
        onColumnOrderChange={mode.setColumnOrder}
        pendingDeletes={mode.pendingDeletes}
        canStageMore={mode.canStageMore}
        onStageDelete={mode.stageDelete}
        onUnstageDelete={mode.unstageDelete}
      />

      {mode.mode === "idle" && (
      <div className={styles.ledgerFoot}>
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => s().addRow(monthIndex, table.id)}>
          {t("widgets.addTransaction")}
        </Button>
        <div className={styles.ledgerTotals}>
          <span className={styles.ledgerTotalLine}>
            {t("widgets.deposits")}: <b className={cn("tnum", styles.depositValue)}>{fmt.money(balance.deposits)}</b>
          </span>
          <span className={styles.ledgerTotalLine}>
            {t("widgets.expenses")}: <b className={cn("tnum", styles.withdrawValue)}>{fmt.money(balance.withdrawals)}</b>
          </span>
        </div>
        <div className={styles.ledgerFinal}>
          <span className={styles.ledgerFinalLabel}>{t("widgets.finalBalance")}</span>
          <span className={styles.ledgerFinalValue}>{fmt.money(balance.finalBalance)}</span>
        </div>
      </div>
      )}
    </div>
  );
});
