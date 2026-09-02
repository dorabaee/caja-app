import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus } from "lucide-react";
import type { CategoryGroup } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { categoryBreakdownForTable } from "@core/compute";
import { Button, ConfirmPopover, Modal, TextInput } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useFormat } from "@ui/hooks/useFormat";
import styles from "./categoriesModal.module.css";

export function CategoriesModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const modalTableId = useUI((s) => s.modalTableId);
  const monthIndex = useUI((s) => s.monthIndex);
  const closeModal = useUI((s) => s.closeModal);
  const project = useCurrentProject();
  const fmt = useFormat();
  const [draft, setDraft] = useState("");
  const [draftGroup, setDraftGroup] = useState<CategoryGroup>("fiscal");

  if (modal !== "categories") return null;

  const table = project?.months[monthIndex]?.tables.find((t) => t.id === modalTableId) ?? null;

  if (!project || !table) {
    return (
      <Modal
        open
        onClose={closeModal}
        title={t("modals.categories")}
        footer={
          <Button variant="primary" onClick={closeModal}>
            {t("common.done")}
          </Button>
        }
      >
        <p className={styles.empty}>{t("modals.tableNotFound")}</p>
      </Modal>
    );
  }

  const categories = project.categories ?? [];
  const textColumns = table.columns.filter((c) => c.type === "text");
  const categoryColumn = table.columns.find((c) => c.category) ?? null;
  const breakdown = categoryBreakdownForTable(table);

  const addCategory = () => {
    const name = draft.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    useStore
      .getState()
      .updateProject(project.id, { categories: [...categories, { name, group: draftGroup }] });
    setDraft("");
  };

  const removeCategory = (name: string) => {
    useStore
      .getState()
      .updateProject(project.id, { categories: categories.filter((c) => c.name !== name) });
  };

  // Grouped Fiscal / No Fiscal, with anything ungrouped (pre-v2 categories) last.
  const groups: { key: string; label: string; items: typeof categories }[] = [
    { key: "fiscal", label: t("widgets.group_fiscal"), items: categories.filter((c) => c.group === "fiscal") },
    { key: "noFiscal", label: t("widgets.group_noFiscal"), items: categories.filter((c) => c.group === "noFiscal") },
    { key: "other", label: t("widgets.groupOther"), items: categories.filter((c) => !c.group) },
  ].filter((g) => g.items.length > 0);

  const onColumnChange = (value: string) => {
    useStore.getState().setColumnCategory(monthIndex, table.id, value || null);
  };

  return (
    <Modal
      open
      onClose={closeModal}
      title={t("modals.categories")}
      description={t("modals.categoriesDescription")}
      footer={
        <Button variant="primary" onClick={closeModal}>
          {t("common.done")}
        </Button>
      }
    >
      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.categories")}</h3>
        {groups.length > 0 ? (
          groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              <div className={styles.chips}>
                {group.items.map((cat) => (
                  <span key={cat.name} className={styles.chip}>
                    {cat.name}
                    <ConfirmPopover
                      message={t("modals.confirmDeleteCategory", { name: cat.name })}
                      onConfirm={() => removeCategory(cat.name)}
                      trigger={
                        <button
                          type="button"
                          className={styles.chipRemove}
                          aria-label={t("modals.removeCategory", { name: cat.name })}
                        >
                          <X size={13} strokeWidth={2.5} aria-hidden />
                        </button>
                      }
                    />
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.muted}>{t("modals.noCategoriesYet")}</p>
        )}
        <form
          className={styles.addRow}
          onSubmit={(e) => {
            e.preventDefault();
            addCategory();
          }}
        >
          <TextInput
            value={draft}
            placeholder={t("modals.newCategory")}
            aria-label={t("modals.newCategory")}
            onChange={(e) => setDraft(e.target.value)}
          />
          <select
            className={styles.select}
            value={draftGroup}
            aria-label={t("modals.categoryGroup")}
            onChange={(e) => setDraftGroup(e.target.value as CategoryGroup)}
          >
            <option value="fiscal">{t("widgets.group_fiscal")}</option>
            <option value="noFiscal">{t("widgets.group_noFiscal")}</option>
          </select>
          <Button type="submit" variant="secondary" icon={<Plus />}>
            {t("common.add")}
          </Button>
        </form>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.categoryColumn")}</h3>
        <p className={styles.muted}>{t("modals.categoryColumnHint")}</p>
        <label className={styles.fieldLabel} htmlFor="cat-column">
          {t("modals.column")}
        </label>
        <select
          id="cat-column"
          className={styles.select}
          value={categoryColumn?.id ?? ""}
          onChange={(e) => onColumnChange(e.target.value)}
        >
          <option value="">{t("modals.noCategory")}</option>
          {textColumns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.summary")}</h3>
        {breakdown.length > 0 ? (
          <ul className={styles.breakdown}>
            {breakdown.map((slice) => (
              <li key={slice.label} className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>{slice.label}</span>
                <span className={styles.dots} aria-hidden />
                <span className={styles.breakdownValue}>{fmt.money(slice.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>{t("modals.noDataYet")}</p>
        )}
      </section>
    </Modal>
  );
}
