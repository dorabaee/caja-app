import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Repeat } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { useCurrentProject } from "@ui/hooks/useProject";
import { Button, Field, IconButton, Modal, TextInput, cn } from "@ui/common";
import { useMonths } from "@ui/hooks/useMonths";
import styles from "./recurringModal.module.css";

const MONTH_INDICES = Array.from({ length: 12 }, (_, i) => i);

export function RecurringModal() {
  const { t } = useTranslation();
  const months = useMonths();
  const modal = useUI((s) => s.modal);
  const modalTableId = useUI((s) => s.modalTableId);
  const monthIndex = useUI((s) => s.monthIndex);
  const closeModal = useUI((s) => s.closeModal);
  const project = useCurrentProject();
  const table = project?.months[monthIndex]?.tables.find((t) => t.id === modalTableId) ?? null;

  const open = modal === "recurring";
  const defs = (project?.recurring ?? []).filter((d) => table && d.tableTitle === table.title);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [cells, setCells] = useState<Record<string, string>>({});
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(11);

  const resetForm = () => {
    setLabel("");
    setCells({});
    setFromMonth(0);
    setToMonth(11);
  };

  // When opened, default to the form when there are no existing defs.
  useEffect(() => {
    if (open) {
      resetForm();
      setAdding(defs.length === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modalTableId]);

  if (!open || !project || !table) return null;

  const invalidRange = toMonth < fromMonth;

  const save = () => {
    if (invalidRange) return;
    const cleanCells: Record<string, string> = {};
    for (const col of table.columns) {
      const v = (cells[col.name] ?? "").trim();
      if (v) cleanCells[col.name] = v;
    }
    useStore.getState().addRecurring(project.id, {
      tableTitle: table.title,
      label: label.trim() || t("modals.defaultRecurringLabel"),
      cells: cleanCells,
      fromMonth,
      toMonth,
    });
    resetForm();
    setAdding(defs.length + 1 === 0);
  };

  const remove = (defId: string) => {
    useStore.getState().removeRecurring(project.id, defId);
  };

  const summarize = (defCells: Record<string, string>) =>
    table.columns
      .map((c) => defCells[c.name])
      .filter((v) => v && v.trim())
      .join(" · ");

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t("modals.recurringTitle")}
      description={t("modals.recurringDescription", { name: table.title })}
      size="md"
      footer={
        <Button variant="primary" onClick={closeModal}>
          {t("common.done")}
        </Button>
      }
    >
      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.recurringForThisTable")}</h3>
        {defs.length === 0 ? (
          <p className={styles.empty}>{t("modals.noRecurringYet")}</p>
        ) : (
          <ul className={styles.list}>
            {defs.map((def) => (
              <li key={def.id} className={styles.item}>
                <span className={styles.itemIcon} aria-hidden>
                  <Repeat size={15} />
                </span>
                <div className={styles.itemText}>
                  <span className={styles.itemLabel}>{def.label}</span>
                  {summarize(def.cells) && (
                    <span className={styles.itemSummary}>{summarize(def.cells)}</span>
                  )}
                </div>
                <span className={styles.range}>
                  {months.short[def.fromMonth]}–{months.short[def.toMonth]}
                </span>
                <IconButton
                  label={t("modals.deleteRecurring", { name: def.label })}
                  icon={<Trash2 />}
                  size="sm"
                  onClick={() => remove(def.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        {adding ? (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <h3 className={styles.heading}>{t("modals.addRecurring")}</h3>

            <Field label={t("modals.name")}>
              {({ id }) => (
                <TextInput
                  id={id}
                  autoFocus
                  value={label}
                  placeholder={t("modals.namePlaceholder")}
                  onChange={(e) => setLabel(e.target.value)}
                />
              )}
            </Field>

            {table.columns.map((col) => {
              const isMoney = col.type === "money";
              return (
                <Field key={col.id} label={col.name}>
                  {({ id }) => (
                    <TextInput
                      id={id}
                      className={cn(isMoney && styles.num)}
                      inputMode={isMoney ? "decimal" : undefined}
                      value={cells[col.name] ?? ""}
                      onChange={(e) =>
                        setCells((prev) => ({ ...prev, [col.name]: e.target.value }))
                      }
                    />
                  )}
                </Field>
              );
            })}

            <div className={styles.range2}>
              <Field label={t("modals.from")} hint={invalidRange ? t("modals.rangeHint") : undefined}>
                {({ id }) => (
                  <select
                    id={id}
                    className={styles.select}
                    value={fromMonth}
                    onChange={(e) => setFromMonth(Number(e.target.value))}
                  >
                    {MONTH_INDICES.map((m) => (
                      <option key={m} value={m}>
                        {months.full[m]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t("modals.to")}>
                {({ id }) => (
                  <select
                    id={id}
                    className={cn(styles.select, invalidRange && styles.selectError)}
                    value={toMonth}
                    onChange={(e) => setToMonth(Number(e.target.value))}
                  >
                    {MONTH_INDICES.map((m) => (
                      <option key={m} value={m}>
                        {months.full[m]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            <div className={styles.formActions}>
              {defs.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setAdding(false);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              )}
              <Button variant="primary" disabled={invalidRange} onClick={save}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" icon={<Plus />} onClick={() => setAdding(true)}>
            {t("modals.addRecurring")}
          </Button>
        )}
      </section>

      <p className={styles.note}>{t("modals.recurringNote")}</p>
    </Modal>
  );
}
