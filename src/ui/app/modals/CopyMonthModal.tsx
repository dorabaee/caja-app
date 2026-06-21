import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { Button, Modal, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useMonths } from "@ui/hooks/useMonths";
import styles from "./copyMonthModal.module.css";

/** Copy the current month's layout (optionally with data) onto one/several/all months. */
export function CopyMonthModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const monthIndex = useUI((s) => s.monthIndex);
  const closeModal = useUI((s) => s.closeModal);
  const months = useMonths();
  const project = useCurrentProject();

  const [withData, setWithData] = useState(false);
  const [targets, setTargets] = useState<Set<number>>(new Set());

  if (modal !== "copyMonth") return null;

  const source = project?.months[monthIndex];
  const sourceName = months.full[monthIndex];
  const sourceCount = (source?.tables.length ?? 0) + (source?.charts.length ?? 0);
  const others = months.full.map((_, i) => i).filter((i) => i !== monthIndex);
  const allSelected = targets.size === others.length;

  const toggle = (i: number) =>
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const toggleAll = () => setTargets(allSelected ? new Set() : new Set(others));

  const close = () => {
    setTargets(new Set());
    closeModal();
  };
  const apply = () => {
    if (targets.size === 0) return;
    useStore.getState().copyMonthInto(monthIndex, [...targets], withData);
    useUI.getState().toast(t("modals.copyMonthDone", { count: targets.size }), "success");
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t("modals.copyMonthTitle", { month: sourceName })}
      description={t("modals.copyMonthDesc")}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            className={styles.applyBtn}
            disabled={targets.size === 0 || sourceCount === 0}
            onClick={apply}
          >
            {t("modals.copyMonthApply", { count: targets.size })}
          </Button>
        </div>
      }
    >
      {sourceCount === 0 ? (
        <p className={styles.empty}>{t("modals.copyMonthEmpty", { month: sourceName })}</p>
      ) : (
        <>
          <section className={styles.section}>
            <h3 className={styles.heading}>{t("modals.copyMonthWhat")}</h3>
            <div className={styles.choices}>
              <button
                type="button"
                className={cn(styles.choice, !withData && styles.choiceOn)}
                onClick={() => setWithData(false)}
              >
                <span className={styles.choiceTitle}>{t("modals.copyMonthLayoutOnly")}</span>
                <span className={styles.choiceDesc}>{t("modals.copyMonthLayoutOnlyDesc")}</span>
              </button>
              <button
                type="button"
                className={cn(styles.choice, withData && styles.choiceOn)}
                onClick={() => setWithData(true)}
              >
                <span className={styles.choiceTitle}>{t("modals.copyMonthWithData")}</span>
                <span className={styles.choiceDesc}>{t("modals.copyMonthWithDataDesc")}</span>
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.monthsHead}>
              <h3 className={styles.heading}>{t("modals.copyMonthTargets")}</h3>
              <button type="button" className={styles.selectAll} onClick={toggleAll}>
                {allSelected ? t("modals.copyMonthClear") : t("modals.copyMonthAll")}
              </button>
            </div>
            <div className={styles.monthGrid}>
              {months.short.map((name, i) => {
                const isSource = i === monthIndex;
                const on = targets.has(i);
                return (
                  <button
                    key={name + i}
                    type="button"
                    disabled={isSource}
                    className={cn(
                      styles.monthCell,
                      on && styles.monthOn,
                      isSource && styles.monthSource,
                    )}
                    onClick={() => toggle(i)}
                    title={isSource ? t("modals.copyMonthSource") : months.full[i]}
                  >
                    {on && <Check size={13} className={styles.monthCheck} aria-hidden />}
                    {name}
                  </button>
                );
              })}
            </div>
          </section>

          <div className={styles.warning} role="alert">
            <AlertTriangle size={16} aria-hidden />
            <div>
              <p className={styles.warnTitle}>{t("modals.copyMonthWarning")}</p>
              <p className={styles.warnHint}>{t("modals.copyMonthHint")}</p>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
