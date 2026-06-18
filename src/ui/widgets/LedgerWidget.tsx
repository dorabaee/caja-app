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
  Trash2,
} from "lucide-react";
import type { Table } from "@core/model/types";
import { ledgerBalance } from "@core/compute";
import { parseMoney } from "@core/format/money";
import { useStore, useUI } from "@core/store";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import { WidgetGrid } from "./WidgetGrid";
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
  const selected = useUI((u) => u.selectedWidgetId === table.id);

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
          aria-label={t("widgets.ledgerTitle")}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setTitle(table.title);
          }}
        />
        <span className={styles.pill}>
          <Landmark size={13} aria-hidden />
          {t("widgets.ledgerPill")}
        </span>
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
          <MenuSeparator />
          <MenuItem icon={<Copy />} onClick={() => s().duplicateTable(monthIndex, table.id)}>
            {t("widgets.duplicateLedger")}
          </MenuItem>
          <MenuItem icon={<Trash2 />} danger onClick={() => s().removeTable(monthIndex, table.id)}>
            {t("widgets.deleteLedger")}
          </MenuItem>
        </Menu>
      </div>

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

      <WidgetGrid monthIndex={monthIndex} table={table} roleColors />

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
    </div>
  );
});
