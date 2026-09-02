import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Landmark, ArrowUpDown, Columns3 } from "lucide-react";
import { BANKS } from "@core/model/banks";
import type { Table } from "@core/model/types";
import { useStore } from "@core/store";
import { IconButton, MenuItem, MenuLabel, MenuSeparator } from "@ui/common";
import type { TableModeApi } from "@ui/hooks/useTableMode";
import styles from "./widget.module.css";

/**
 * The ✕ / ✓ pair that replaces a widget's normal header controls while it is in row-reorder
 * or column-edit mode. These are the only two ways out of a mode (plus Esc, which is ✕).
 */
export function ModeActions({ mode }: { mode: TableModeApi }) {
  const { t } = useTranslation();
  if (mode.mode === "idle") return null;
  const label = mode.mode === "reorder" ? t("widgets.reorderRowsMode") : t("widgets.editColumnsMode");
  return (
    <span className={styles.modeBar}>
      <span className={styles.modeLabel}>{label}</span>
      <IconButton
        label={t("common.cancel")}
        icon={<X />}
        size="sm"
        className={styles.modeCancel}
        onClick={mode.cancel}
      />
      <IconButton
        label={t("common.save")}
        icon={<Check />}
        size="sm"
        className={styles.modeConfirm}
        onClick={mode.confirm}
      />
    </span>
  );
}

/**
 * Menu block shared by the table and ledger ⋯ menus: enter reorder / column-edit mode,
 * mark the table fiscal, and — once it is — tag it with a bank. `fiscal` is a plain flag,
 * so any table can be one (not just the ledger); the month's "Te queda" card adds up every
 * fiscal table when it is flipped to "Saldo final".
 */
export function TableModeMenuItems({
  monthIndex,
  table,
  mode,
}: {
  monthIndex: number;
  table: Table;
  mode: TableModeApi;
}) {
  const { t } = useTranslation();
  const s = useStore.getState;
  return (
    <Fragment>
      <MenuSeparator />
      <MenuItem icon={<ArrowUpDown />} onClick={mode.startReorder}>
        {t("widgets.reorderRows")}
      </MenuItem>
      <MenuItem icon={<Columns3 />} onClick={mode.startColumns}>
        {t("widgets.editColumns")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        icon={<Landmark />}
        checked={!!table.fiscal}
        onClick={() => s().setTableFiscal(monthIndex, table.id, !table.fiscal)}
      >
        {t("widgets.markFiscal")}
      </MenuItem>
      {table.fiscal && (
        <Fragment>
          <MenuLabel>{t("widgets.bank")}</MenuLabel>
          {BANKS.map((b) => (
            <MenuItem
              key={b.key}
              checked={table.bank === b.key}
              onClick={() => s().setTableBank(monthIndex, table.id, table.bank === b.key ? null : b.key)}
            >
              {b.label}
            </MenuItem>
          ))}
          {table.bank && (
            <MenuItem onClick={() => s().setTableBank(monthIndex, table.id, null)}>
              {t("widgets.bankNone")}
            </MenuItem>
          )}
        </Fragment>
      )}
    </Fragment>
  );
}
