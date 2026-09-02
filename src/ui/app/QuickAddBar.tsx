import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Plus, ChevronDown } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { uniqueTableLabels } from "@core/compute";
import type { Column, LedgerRole, Table } from "@core/model/types";
import { Button, Menu, MenuItem, MenuLabel, TextInput, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./quickAddBar.module.css";

const firstOfType = (cols: Column[], type: Column["type"]): Column | undefined =>
  cols.find((c) => c.type === type);

/**
 * Date to stamp on a quick-added row: it belongs to the month being VIEWED, not
 * today's month. Uses the project's year + that month; the day is today's day
 * when the viewed month is the current one, otherwise the 1st.
 */
const rowDateISO = (year: number, monthIndex: number): string => {
  const now = new Date();
  const day = year === now.getFullYear() && monthIndex === now.getMonth() ? now.getDate() : 1;
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

export function QuickAddBar(props: { monthIndex: number; compact?: boolean }) {
  const { monthIndex, compact = false } = props;
  const { t } = useTranslation();
  const project = useCurrentProject();
  const month = project?.months[monthIndex];
  // Every table in the month, ledgers included — a ledger just needs to be told which of
  // its two money columns the amount belongs in (see `role` below).
  const candidates: Table[] = month?.tables ?? [];
  const labels = useMemo(() => uniqueTableLabels(candidates), [candidates]);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    candidates[0]?.id ?? null,
  );
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  // Ledgers only: which column the amount lands in. Gasto is the common entry.
  const [role, setRole] = useState<LedgerRole>("withdrawal");
  const conceptoRef = useRef<HTMLInputElement>(null);

  // Keep selection valid as tables come and go.
  const selected =
    candidates.find((t) => t.id === selectedTableId) ?? candidates[0] ?? null;
  useEffect(() => {
    if (selected && selected.id !== selectedTableId) setSelectedTableId(selected.id);
  }, [selected, selectedTableId]);

  if (candidates.length === 0) return null;

  const submit = () => {
    const table = candidates.find((t) => t.id === selected?.id) ?? null;
    if (!table) return;
    const concept = concepto.trim();
    const amount = monto.trim();
    if (!concept && !amount) return;

    const firstText = firstOfType(table.columns, "text");
    const firstDate = firstOfType(table.columns, "date");
    // In a ledger the amount is routed by column role, not by position: putting an
    // expense in "Depósito" would silently invert the saldo.
    const firstMoney =
      table.kind === "ledger"
        ? (table.columns.find((c) => c.type === "money" && c.role === role) ??
          firstOfType(table.columns, "money"))
        : firstOfType(table.columns, "money");

    const values: Record<string, string> = {};
    if (firstText && concept) values[firstText.id] = concept;
    if (firstMoney && amount) values[firstMoney.id] = amount;
    if (firstDate) {
      const year = project ? new Date(project.createdAt).getFullYear() : new Date().getFullYear();
      values[firstDate.id] = rowDateISO(year, monthIndex);
    }

    useStore.getState().addRowWithValues(monthIndex, table.id, values);
    useUI.getState().toast(t("month.added", { name: labels[table.id] ?? table.title }), "success");
    setConcepto("");
    setMonto("");
    conceptoRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const btnSize = compact ? "sm" : "md";

  return (
    <div
      className={cn(styles.bar, compact && styles.compact)}
      role="group"
      aria-label={t("month.quickAddAria")}
    >
      <span className={styles.lead} aria-hidden>
        <Zap size={16} />
      </span>

      <Menu
        align="start"
        trigger={
          <Button variant="secondary" size={btnSize} className={styles.picker}>
            <span className={styles.pickerLabel}>
              {selected ? (labels[selected.id] ?? selected.title) : "—"}
            </span>
            <ChevronDown size={15} className={styles.chev} aria-hidden />
          </Button>
        }
      >
        <MenuLabel>{t("month.table")}</MenuLabel>
        {candidates.map((c) => (
          <MenuItem
            key={c.id}
            checked={c.id === selected?.id}
            onClick={() => setSelectedTableId(c.id)}
          >
            {labels[c.id] ?? c.title}
          </MenuItem>
        ))}
      </Menu>

      {selected?.kind === "ledger" && (
        <div className={styles.roles} role="group" aria-label={t("month.ledgerTarget")}>
          <button
            type="button"
            className={cn(styles.roleBtn, role === "deposit" && styles.roleOn)}
            aria-pressed={role === "deposit"}
            onClick={() => setRole("deposit")}
          >
            {t("widgets.deposits")}
          </button>
          <button
            type="button"
            className={cn(styles.roleBtn, role === "withdrawal" && styles.roleOn)}
            aria-pressed={role === "withdrawal"}
            onClick={() => setRole("withdrawal")}
          >
            {t("widgets.expenses")}
          </button>
        </div>
      )}

      <TextInput
        ref={conceptoRef}
        className={cn(styles.concepto, compact && styles.conceptoCompact)}
        value={concepto}
        placeholder={t("month.conceptPlaceholder")}
        aria-label={t("month.concept")}
        onChange={(e) => setConcepto(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <TextInput
        className={cn(styles.monto, compact && styles.montoCompact)}
        value={monto}
        inputMode="decimal"
        placeholder="0.00"
        aria-label={t("month.amount")}
        onChange={(e) => setMonto(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <Button
        variant="primary"
        size={btnSize}
        icon={<Plus />}
        onClick={submit}
        aria-label={t("common.add")}
      >
        {compact ? null : t("common.add")}
      </Button>
    </div>
  );
}
