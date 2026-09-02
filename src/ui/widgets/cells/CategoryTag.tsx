import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Plus, X } from "lucide-react";
import type { Category, CategoryGroup } from "@core/model/types";
import { Popover, cn } from "@ui/common";
import styles from "../widget.module.css";

/**
 * Per-row category tag (#14) — lives in the row actions slot where attachments were.
 * Reads/writes the table's category column, picks from the project's categories, and
 * can create a new one. Keeps the existing category-column model intact (no migration).
 *
 * Categories are grouped Fiscal / No Fiscal; the group matching the host table is listed
 * first, and a category created from here inherits it.
 */
export function CategoryTag({
  value,
  categories,
  preferredGroup,
  onSelect,
  onCreate,
  onClear,
}: {
  value: string;
  categories: Category[];
  /** The host table's own half of the books — orders the list and seeds new entries. */
  preferredGroup: CategoryGroup;
  onSelect: (name: string) => void;
  onCreate: (name: string, group: CategoryGroup) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const sections = useMemo(() => {
    const other: CategoryGroup = preferredGroup === "fiscal" ? "noFiscal" : "fiscal";
    const pick = (g: CategoryGroup) => categories.filter((c) => c.group === g);
    return [
      { group: preferredGroup, label: t(`widgets.group_${preferredGroup}`), items: pick(preferredGroup) },
      { group: other, label: t(`widgets.group_${other}`), items: pick(other) },
      // Categories carried over from before the grouped model keep working, unlabelled.
      { group: null, label: t("widgets.groupOther"), items: categories.filter((c) => !c.group) },
    ].filter((s) => s.items.length > 0);
  }, [categories, preferredGroup, t]);

  return (
    <Popover
      align="end"
      minWidth={240}
      className={styles.tagPop}
      onOpenChange={(open) => {
        if (open) setDraft("");
      }}
      trigger={
        <button
          type="button"
          className={cn(styles.cellBtn, value && styles.tagBtnSet)}
          title={value || t("widgets.tagAdd")}
          aria-label={value ? t("widgets.tagEdit", { name: value }) : t("widgets.tagAdd")}
        >
          <Tag size={12} aria-hidden />
        </button>
      }
    >
      {({ close }) => (
        <div className={styles.tagPanel}>
          {sections.length ? (
            <div className={styles.tagList}>
              {sections.map((section) => (
                <div key={section.label} className={styles.tagGroup}>
                  <p className={styles.tagGroupLabel}>{section.label}</p>
                  {section.items.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      className={cn(styles.tagOption, cat.name === value && styles.tagOptionOn)}
                      onClick={() => {
                        onSelect(cat.name);
                        close();
                      }}
                    >
                      <Tag size={12} aria-hidden />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.tagEmpty}>{t("widgets.tagNoneYet")}</p>
          )}

          <form
            className={styles.tagCreate}
            onSubmit={(e) => {
              e.preventDefault();
              const name = draft.trim();
              if (!name) return;
              const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
              if (existing) onSelect(existing.name);
              else onCreate(name, preferredGroup);
              setDraft("");
              close();
            }}
          >
            <input
              className={styles.tagInput}
              value={draft}
              placeholder={t("widgets.tagCreate")}
              aria-label={t("widgets.tagCreate")}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className={styles.tagAddBtn} aria-label={t("common.add")}>
              <Plus size={14} aria-hidden />
            </button>
          </form>

          {value && (
            <button
              type="button"
              className={styles.tagClear}
              onClick={() => {
                onClear();
                close();
              }}
            >
              <X size={12} aria-hidden /> {t("widgets.tagClear")}
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}
