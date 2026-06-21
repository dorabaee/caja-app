import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Plus, X } from "lucide-react";
import { Popover, cn } from "@ui/common";
import styles from "../widget.module.css";

/**
 * Per-row category tag (#14) — lives in the row actions slot where attachments were.
 * Reads/writes the table's category column, picks from the project's categories, and
 * can create a new one. Keeps the existing category-column model intact (no migration).
 */
export function CategoryTag({
  value,
  categories,
  onSelect,
  onCreate,
  onClear,
}: {
  value: string;
  categories: string[];
  onSelect: (name: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  return (
    <Popover
      align="end"
      minWidth={220}
      className={styles.tagPop}
      onOpenChange={(open) => {
        if (open) setDraft("");
      }}
      trigger={
        <button
          type="button"
          className={cn(styles.tagBtn, value && styles.tagBtnSet)}
          title={value || t("widgets.tagAdd")}
          aria-label={value ? t("widgets.tagEdit", { name: value }) : t("widgets.tagAdd")}
        >
          <Tag size={12} aria-hidden />
        </button>
      }
    >
      {({ close }) => (
        <div className={styles.tagPanel}>
          {categories.length ? (
            <div className={styles.tagList}>
              {categories.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={cn(styles.tagOption, name === value && styles.tagOptionOn)}
                  onClick={() => {
                    onSelect(name);
                    close();
                  }}
                >
                  <Tag size={12} aria-hidden />
                  <span>{name}</span>
                </button>
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
              const existing = categories.find((c) => c.toLowerCase() === name.toLowerCase());
              if (existing) onSelect(existing);
              else onCreate(name);
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
