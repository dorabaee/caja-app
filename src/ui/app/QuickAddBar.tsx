import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Plus, ChevronDown, CalendarDays, ArrowRight } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { uniqueTableLabels } from "@core/compute";
import type { Column, Table } from "@core/model/types";
import { Button, Menu, MenuItem, MenuLabel, TextInput, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { DatePicker } from "@ui/widgets/cells/DatePicker";
import { parseDateCell } from "@core/format/date";
import { parseMoney } from "@core/format/money";
import { format } from "date-fns";
import styles from "./quickAddBar.module.css";

const firstOfType = (cols: Column[], type: Column["type"]): Column | undefined =>
  cols.find((c) => c.type === type);

type QuickTargets = { amount: string | null; concept: string | null; date: string | null };

/** Income tables reserve their first text column for Día; an added text column is the concept. */
const conceptColumn = (cols: Column[], kind: Table["kind"]): Column | undefined => {
  const texts = cols.filter((column) => column.type === "text");
  return kind === "income"
    ? texts.find((column) => !/^d[ií]a$/i.test(column.name.trim()))
    : texts[0];
};

/** Income tables use their Día text column as Quick Add's date destination. */
const incomeDayColumn = (table: Table): Column | undefined =>
  table.kind === "income"
    ? table.columns.find((column) => column.type === "text" && /^d[ií]a$/i.test(column.name.trim()))
      ?? firstOfType(table.columns, "text")
    : undefined;

const defaultTargets = (table: Table | null): QuickTargets => ({
  amount: table
    ? (table.kind === "ledger"
        ? table.columns.find((column) => column.type === "money" && column.role === "withdrawal")
        : firstOfType(table.columns, "money"))?.id ?? null
    : null,
  concept: table ? conceptColumn(table.columns, table.kind)?.id ?? null : null,
  date: table
    ? (firstOfType(table.columns, "date") ?? incomeDayColumn(table))?.id ?? null
    : null,
});

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
  const [targets, setTargets] = useState<QuickTargets>(() => defaultTargets(null));
  const conceptoRef = useRef<HTMLInputElement>(null);

  // Keep selection valid as tables come and go.
  const selected =
    candidates.find((t) => t.id === selectedTableId) ?? candidates[0] ?? null;
  const selectedHasConcept = !!selected && !!conceptColumn(selected.columns, selected.kind);
  useEffect(() => {
    if (selected && selected.id !== selectedTableId) setSelectedTableId(selected.id);
  }, [selected, selectedTableId, setSelectedTableId]);
  useEffect(() => {
    setTargets(defaultTargets(selected));
  }, [selected?.id]);

  if (candidates.length === 0) return null;

  const submit = () => {
    const table = candidates.find((t) => t.id === selected?.id) ?? null;
    if (!table) return;
    const concept = concepto.trim();
    const amount = monto.trim();
    const requirements = project?.quickAddRequirements?.[table.title] ?? {};
    if (!concept && !amount && !fecha.trim()) return;
    if (requirements.amount && !amount) {
      useUI.getState().toast(t("month.amountRequired"), "error");
      return;
    }
    if (requirements.concept && !concept) {
      useUI.getState().toast(t("month.conceptRequired"), "error");
      return;
    }
    if (requirements.date && !fecha.trim()) {
      useUI.getState().toast(t("month.dateRequired"), "error");
      return;
    }
    const parsedQuickDate = fecha.trim() ? parseDateCell(fecha.trim()) : null;
    if (fecha.trim() && !parsedQuickDate) {
      useUI.getState().toast(t("month.invalidDate"), "error");
      return;
    }
    if (parsedQuickDate && parsedQuickDate.getMonth() !== monthIndex) {
      useUI.getState().toast(t("month.dateOutsideMonth"), "error");
      return;
    }

    const dayColumn = incomeDayColumn(table);
    const conceptCell = table.columns.find((column) => column.id === targets.concept);
    const dateCell = table.columns.find((column) => column.id === targets.date);
    const firstMoney = table.columns.find((column) => column.id === targets.amount);

    if ((amount && !firstMoney) || (concept && !conceptCell) || (fecha.trim() && !dateCell)) {
      useUI.getState().toast(t("month.chooseDestination"), "error");
      return;
    }

    const values: Record<string, string> = {};
    const dateValue = dateCell && parsedQuickDate
      ? table.kind === "income" && dateCell.id === dayColumn?.id
        ? String(parsedQuickDate.getDate())
        : format(parsedQuickDate, "yyyy-MM-dd")
      : null;

    // An income table is a one-row-per-day tracker, not a transaction list. Its days
    // are pre-created for the selected month, so selecting the 7th updates the existing
    // "7" row and accumulates another receipt into that day's total.
    if (table.kind === "income" && dayColumn && parsedQuickDate) {
      const day = String(parsedQuickDate.getDate());
      const existingDay = table.rows.find((row) => row.cells[dayColumn.id] === day);
      if (existingDay) {
        if (firstMoney && amount) {
          const total = parseMoney(existingDay.cells[firstMoney.id]) + parseMoney(amount);
          useStore.getState().setCell(monthIndex, table.id, existingDay.id, firstMoney.id, String(total));
        }
        if (conceptCell && concept) {
          useStore.getState().setCell(monthIndex, table.id, existingDay.id, conceptCell.id, concept);
        }
        if (dateCell && dateValue !== null) {
          useStore.getState().setCell(monthIndex, table.id, existingDay.id, dateCell.id, dateValue);
        }
        useUI.getState().toast(t("month.added", { name: labels[table.id] ?? table.title }), "success");
        setConcepto("");
        setMonto("");
        setFecha("");
        conceptoRef.current?.focus();
        return;
      }
      // Legacy income tables may only contain 28 rows. Keep the selected day visible
      // as a day number and restore chronological order after adding the missing row.
      values[dayColumn.id] = day;
    }
    if (conceptCell && concept) values[conceptCell.id] = concept;
    if (firstMoney && amount) values[firstMoney.id] = amount;
    if (dateCell && dateValue !== null) {
      values[dateCell.id] = dateValue;
    }

    useStore.getState().addRowWithValues(monthIndex, table.id, values);
    if (table.kind === "income" && dayColumn && parsedQuickDate) {
      useStore.getState().sortRows(monthIndex, table.id, dayColumn.id, "asc");
    }
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

      {selected && (
        <div className={styles.targets} aria-label={t("month.destinationColumns")}>
          <TargetPicker
            label={t("month.amount")}
            table={selected}
            value={targets.amount}
            accepts={(column) => column.type === "money"}
            onChange={(amount) => setTargets((current) => ({ ...current, amount }))}
          />
          {selectedHasConcept && (
            <TargetPicker
              label={t("month.concept")}
              table={selected}
              value={targets.concept}
              accepts={(column) => column.type === "text" && !/^d[ií]a$/i.test(column.name.trim())}
              onChange={(concept) => setTargets((current) => ({ ...current, concept }))}
            />
          )}
          <TargetPicker
            label={t("month.date")}
            table={selected}
            value={targets.date}
            accepts={(column) => column.type === "date" || column.id === incomeDayColumn(selected)?.id}
            onChange={(date) => setTargets((current) => ({ ...current, date }))}
          />
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

      {selectedHasConcept && (
        <TextInput
          ref={conceptoRef}
          className={cn(styles.concepto, compact && styles.conceptoCompact)}
          value={concepto}
          placeholder={t("month.conceptPlaceholder")}
          aria-label={t("month.concept")}
          onChange={(e) => setConcepto(e.target.value)}
          onKeyDown={onKeyDown}
        />
      )}

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

function TargetPicker({
  label,
  table,
  value,
  accepts,
  onChange,
}: {
  label: string;
  table: Table;
  value: string | null;
  accepts: (column: Column) => boolean;
  onChange: (columnId: string | null) => void;
}) {
  const { t } = useTranslation();
  const selected = table.columns.find((column) => column.id === value);
  return (
    <Menu
      align="start"
      minWidth={220}
      trigger={
        <button type="button" className={styles.targetTrigger}>
          <span className={styles.targetField}>{label}</span>
          <ArrowRight size={12} aria-hidden />
          <span className={cn(styles.targetName, !selected && styles.targetMissing)}>
            {selected?.name ?? t("month.noDestination")}
          </span>
          <ChevronDown size={13} aria-hidden />
        </button>
      }
    >
      <MenuLabel>{t("month.destinationFor", { field: label })}</MenuLabel>
      {table.columns.map((column) => (
        <MenuItem
          key={column.id}
          checked={column.id === value}
          disabled={!accepts(column)}
          onClick={() => onChange(column.id)}
        >
          <span className={styles.columnOption}>
            <span>{column.name}</span>
            <span>{t(`widgets.type${column.type[0].toUpperCase()}${column.type.slice(1)}`)}</span>
          </span>
        </MenuItem>
      ))}
    </Menu>
  );
}
