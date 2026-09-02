import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus, X, Landmark } from "lucide-react";
import { BANKS, bankInitials } from "@core/model/banks";
import { useStore, useUI } from "@core/store";
import { Button, Modal, TextInput, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./bankModal.module.css";

/**
 * Picks the bank account a fiscal table stands for. The six built-ins ship a logo;
 * anything a business owner adds here is theirs alone and shows as initials, which is
 * the honest thing to do rather than inventing artwork for a bank we don't know.
 */
export function BankModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const modalTableId = useUI((s) => s.modalTableId);
  const monthIndex = useUI((s) => s.monthIndex);
  const closeModal = useUI((s) => s.closeModal);
  const project = useCurrentProject();
  const [draft, setDraft] = useState("");

  if (modal !== "bank") return null;

  const table = project?.months[monthIndex]?.tables.find((tb) => tb.id === modalTableId) ?? null;

  if (!project || !table) {
    return (
      <Modal
        open
        onClose={closeModal}
        title={t("widgets.bank")}
        footer={
          <Button variant="primary" onClick={closeModal}>
            {t("common.done")}
          </Button>
        }
      >
        <p className={styles.muted}>{t("modals.tableNotFound")}</p>
      </Modal>
    );
  }

  const custom = project.banks ?? [];
  const current = table.bank ?? null;

  const pick = (key: string | null) =>
    useStore.getState().setTableBank(monthIndex, table.id, key === current ? null : key);

  const addBank = () => {
    const name = draft.trim();
    if (!name) return;
    const existing = custom.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      pick(existing.id);
      setDraft("");
      return;
    }
    const id = useStore.getState().addCustomBank(project.id, name);
    useStore.getState().setTableBank(monthIndex, table.id, id);
    setDraft("");
  };

  const removeBank = (id: string) => {
    useStore.getState().removeCustomBank(project.id, id);
  };

  return (
    <Modal
      open
      onClose={closeModal}
      title={t("widgets.bank")}
      description={t("modals.bankDescription")}
      footer={
        <Button variant="primary" onClick={closeModal}>
          {t("common.done")}
        </Button>
      }
    >
      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.bankBuiltIn")}</h3>
        <div className={styles.grid}>
          {BANKS.map((b) => {
            const on = current === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className={cn(styles.card, on && styles.cardOn)}
                aria-pressed={on}
                onClick={() => pick(b.key)}
              >
                <span className={styles.logoPlate} aria-hidden>
                  <img
                    className={styles.logo}
                    src={`${import.meta.env.BASE_URL}banks/${b.logo}`}
                    alt=""
                  />
                </span>
                <span className={styles.name}>{b.label}</span>
                {on && (
                  <span className={styles.check} aria-hidden>
                    <Check size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.bankCustom")}</h3>
        {custom.length > 0 ? (
          <div className={styles.grid}>
            {custom.map((b) => {
              const on = current === b.id;
              return (
                <div key={b.id} className={cn(styles.card, on && styles.cardOn)}>
                  <button
                    type="button"
                    className={styles.cardPick}
                    aria-pressed={on}
                    onClick={() => pick(b.id)}
                  >
                    <span className={styles.initials} aria-hidden>
                      {bankInitials(b.name)}
                    </span>
                    <span className={styles.name}>{b.name}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={t("modals.bankRemove", { name: b.name })}
                    onClick={() => removeBank(b.id)}
                  >
                    <X size={13} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.muted}>{t("modals.bankNoneYet")}</p>
        )}

        <form
          className={styles.addRow}
          onSubmit={(e) => {
            e.preventDefault();
            addBank();
          }}
        >
          <TextInput
            value={draft}
            placeholder={t("modals.bankPlaceholder")}
            aria-label={t("modals.bankAdd")}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="secondary" icon={<Plus />}>
            {t("common.add")}
          </Button>
        </form>
        <p className={styles.hint}>{t("modals.bankCustomHint")}</p>
      </section>

      {current && (
        <button type="button" className={styles.clear} onClick={() => pick(null)}>
          <Landmark size={13} aria-hidden /> {t("widgets.bankNone")}
        </button>
      )}
    </Modal>
  );
}
