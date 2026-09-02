import { useMemo, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Plus, X } from "lucide-react";
import type { Category, CategoryGroup } from "@core/model/types";
import { Popover, cn } from "@ui/common";
import styles from "../widget.module.css";

export interface CategoryPickerProps {
  /** The row's current category name ("" when it has none). */
  value: string;
  categories: Category[];
  /** The host table's own half of the books — orders the list and seeds new entries. */
  preferredGroup: CategoryGroup;
  onSelect: (name: string) => void;
  onCreate: (name: string, group: CategoryGroup) => void;
  onClear: () => void;
  /** The clickable element the popover hangs off (an icon, a chip, a whole cell). */
  trigger: ReactElement;
}

/**
 * The category list itself: grouped Fiscal / No fiscal, with the host table's group
 * first, plus a create field. Every category surface in the app opens this same panel —
 * only the trigger differs, so a chip cell and a tag icon behave identically.
 *
 * It reads and writes the ROW's category, never a cell's text: that is what lets one
 * category ("Gasolina") cover two different descriptions ("de la camioneta",
 * "personal") without inventing a category per description.
 */
export function CategoryPicker({
  value,
  categories,
  preferredGroup,
  onSelect,
  onCreate,
  onClear,
  trigger,
}: CategoryPickerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const sections = useMemo(() => {
    const other: CategoryGroup = preferredGroup === "fiscal" ? "noFiscal" : "fiscal";
    // The selected category is pinned to the top of its section; every other category
    // keeps its original relative order below it.
    const pick = (g: CategoryGroup | null) => {
      const items = categories.filter((c) => (g === null ? !c.group : c.group === g));
      const idx = value ? items.findIndex((c) => c.name === value) : -1;
      if (idx <= 0) return items;
      return [items[idx], ...items.slice(0, idx), ...items.slice(idx + 1)];
    };
    return [
      { group: preferredGroup, label: t(`widgets.group_${preferredGroup}`), items: pick(preferredGroup) },
      { group: other, label: t(`widgets.group_${other}`), items: pick(other) },
      // Categories carried over from before the grouped model keep working, unlabelled.
      { group: null, label: t("widgets.groupOther"), items: pick(null) },
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
      trigger={trigger}
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
