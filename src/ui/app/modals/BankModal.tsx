import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Landmark, Plus, X } from "lucide-react";
import { BANKS, bankInitials } from "@core/model/banks";
import { useStore, useUI } from "@core/store";
import { Button, ConfirmPopover, Modal, TextInput, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./bankModal.module.css";

/**
 * Picks the bank account a fiscal table stands for.
 *
 * Two screens: choosing an account, and managing the ones the user added. Adding lived
 * inline at first, which left a bare text field and an initials chip on the picker with
 * nothing explaining either — the button and its own screen say what they're for.
 */
export function BankModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const modalTableId = useUI((s) => s.modalTableId);
  const monthIndex = useUI((s) => s.monthIndex);
  const closeModal = useUI((s) => s.closeModal);
  const project = useCurrentProject();
  const [screen, setScreen] = useState<"pick" | "manage">("pick");
  const [draft, setDraft] = useState("");

  // Reopening always starts on the picker, never wherever it was left.
  useEffect(() => {
    if (modal === "bank") {
      setScreen("pick");
      setDraft("");
    }
  }, [modal]);

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
    const bankId = useStore.getState().addCustomBank(project.id, name);
    useStore.getState().setTableBank(monthIndex, table.id, bankId);
    setDraft("");
  };

  return (
    <Modal
      open
      onClose={closeModal}
      title={screen === "pick" ? t("widgets.bank") : t("modals.bankCustom")}
      description={screen === "pick" ? t("modals.bankDescription") : t("modals.bankManageDesc")}
      footer={
        screen === "pick" ? (
          <Button variant="primary" onClick={closeModal}>
            {t("common.done")}
          </Button>
        ) : (
          <Button variant="secondary" icon={<ChevronLeft />} onClick={() => setScreen("pick")}>
            {t("common.back")}
          </Button>
        )
      }
    >
      {screen === "pick" ? (
        <div className={styles.screen} key="pick">
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
            {custom.length > 0 && (
              <div className={styles.grid}>
                {custom.map((b) => {
                  const on = current === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={cn(styles.card, on && styles.cardOn)}
                      aria-pressed={on}
                      onClick={() => pick(b.id)}
                    >
                      <span className={styles.initials} aria-hidden>
                        {bankInitials(b.name)}
                      </span>
                      <span className={styles.name}>{b.name}</span>
                      {on && (
                        <span className={styles.check} aria-hidden>
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" className={styles.manageBtn} onClick={() => setScreen("manage")}>
              <span className={styles.manageIcon} aria-hidden>
                <Plus size={15} />
              </span>
              <span className={styles.manageText}>
                <span className={styles.manageTitle}>{t("modals.bankAddTitle")}</span>
                <span className={styles.manageHint}>{t("modals.bankAddHint")}</span>
              </span>
              <ChevronRight size={16} className={styles.manageChevron} aria-hidden />
            </button>
          </section>

          {current && (
            <button type="button" className={styles.clear} onClick={() => pick(null)}>
              <Landmark size={13} aria-hidden /> {t("widgets.bankNone")}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.screen} key="manage">
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              addBank();
            }}
          >
            <TextInput
              autoFocus
              value={draft}
              placeholder={t("modals.bankPlaceholder")}
              aria-label={t("modals.bankAdd")}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" variant="primary" icon={<Plus />} disabled={!draft.trim()}>
              {t("common.add")}
            </Button>
          </form>

          {custom.length > 0 ? (
            <div className={styles.chips}>
              {custom.map((b) => (
                <span key={b.id} className={styles.chip}>
                  <span className={styles.chipInitials} aria-hidden>
                    {bankInitials(b.name)}
                  </span>
                  {b.name}
                  <ConfirmPopover
                    message={t("modals.bankConfirmDelete", { name: b.name })}
                    onConfirm={() => useStore.getState().removeCustomBank(project.id, b.id)}
                    trigger={
                      <button
                        type="button"
                        className={styles.chipRemove}
                        aria-label={t("modals.bankRemove", { name: b.name })}
                      >
                        <X size={13} strokeWidth={2.5} aria-hidden />
                      </button>
                    }
                  />
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>{t("modals.bankNoneYet")}</p>
          )}

          <p className={styles.hint}>{t("modals.bankCustomHint")}</p>
        </div>
      )}
    </Modal>
  );
}
