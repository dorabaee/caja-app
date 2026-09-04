import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Plus, ChevronDown, CalendarDays } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { uniqueTableLabels } from "@core/compute";
import type { Column, LedgerRole, Table } from "@core/model/types";
import { Button, Menu, MenuItem, MenuLabel, TextInput, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { DatePicker } from "@ui/widgets/cells/DatePicker";
import { parseDateCell } from "@core/format/date";
import { format } from "date-fns";
import styles from "./quickAddBar.module.css";

const firstOfType = (cols: Column[], type: Column["type"]): Column | undefined =>
  cols.find((c) => c.type === type);

/** Accept typed or pasted digits while keeping the visible DD/MM/YYYY structure. */
const maskDate = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export function QuickAddBar(props: { monthIndex: number; compact?: boolean }) {
  const { monthIndex, compact = false } = props;
  const { t } = useTranslation();
  const project = useCurrentProject();
  const dateMode = useStore((s) => s.doc.settings.quickAddDateMode);
  const month = project?.months[monthIndex];
  // Every table in the month, ledgers included — a ledger just needs to be told which of
  // its two money columns the amount belongs in (see `role` below).
  const candidates: Table[] = month?.tables ?? [];
  const labels = useMemo(() => uniqueTableLabels(candidates), [candidates]);

  const selectedTableId = useUI((s) => s.quickAddTableId);
  const setSelectedTableId = useUI((s) => s.setQuickAddTable);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  // Ledgers only: which column the amount lands in. Gasto is the common entry.
  const [role, setRole] = useState<LedgerRole>("withdrawal");
  const conceptoRef = useRef<HTMLInputElement>(null);

  // Keep selection valid as tables come and go.
  const selected =
    candidates.find((t) => t.id === selectedTableId) ?? candidates[0] ?? null;
  useEffect(() => {
    if (selected && selected.id !== selectedTableId) setSelectedTableId(selected.id);
  }, [selected, selectedTableId, setSelectedTableId]);

  if (candidates.length === 0) return null;

  const submit = () => {
    const table = candidates.find((t) => t.id === selected?.id) ?? null;
    if (!table) return;
    const concept = concepto.trim();
    const amount = monto.trim();
    if (!concept && !amount) return;
    const parsedQuickDate = fecha.trim() ? parseDateCell(fecha.trim()) : null;
    if (fecha.trim() && !parsedQuickDate) {
      useUI.getState().toast(t("month.invalidDate"), "error");
      return;
    }

    const firstText = firstOfType(table.columns, "text");
    let firstDate = firstOfType(table.columns, "date");
    // Tables created before the date-aware quick add may not have a date column. Add one
    // only when the user actually supplies a date, so the shortcut remains useful for
    // legacy/custom tables without changing their structure on render.
    if (!firstDate && fecha.trim()) {
      useStore.getState().addColumn(monthIndex, table.id, "date");
      firstDate = firstOfType(
        useStore.getState().doc.projects.find((p) => p.id === project?.id)?.months[monthIndex]?.tables.find((t) => t.id === table.id)?.columns ?? [],
        "date",
      );
    }
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
    if (firstDate && fecha.trim()) {
      values[firstDate.id] = format(parsedQuickDate!, "yyyy-MM-dd");
    }

    useStore.getState().addRowWithValues(monthIndex, table.id, values);
    useUI.getState().toast(t("month.added", { name: labels[table.id] ?? table.title }), "success");
    setConcepto("");
    setMonto("");
    setFecha("");
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
        className={cn(styles.monto, compact && styles.montoCompact)}
        value={monto}
        inputMode="decimal"
        placeholder="0.00"
        aria-label={t("month.amount")}
        onChange={(e) => setMonto(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <TextInput
        ref={conceptoRef}
        className={cn(styles.concepto, compact && styles.conceptoCompact)}
        value={concepto}
        placeholder={t("month.conceptPlaceholder")}
        aria-label={t("month.concept")}
        onChange={(e) => setConcepto(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className={cn(styles.dateField, dateMode === "calendar" && styles.dateCalendarOnly)}>
        {dateMode === "typing" ? (
          <TextInput value={fecha} inputMode="numeric" maxLength={10} placeholder={t("widgets.datePlaceholder")} aria-label={t("widgets.pickDate")} onChange={(e) => setFecha(maskDate(e.target.value))} onKeyDown={onKeyDown} />
        ) : (
          <DatePicker value={fecha} onChange={setFecha} initialDate={new Date(new Date().getFullYear(), monthIndex, 1)} trigger={
            <button type="button" className={styles.dateTrigger} aria-label={t("widgets.pickDate")}>
              <CalendarDays size={15} aria-hidden />
            </button>
          } />
        )}
      </div>

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
