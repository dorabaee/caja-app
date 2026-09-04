import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { cn } from "@ui/common";
import { CategoryPicker, type CategoryPickerProps } from "./CategoryPicker";
import styles from "../widget.module.css";

/**
 * The small tag icon that sits in a cell's action row — the only indicator of the row's
 * category, styled and behaved exactly like the note icon: hidden until row hover when
 * unset, permanently visible and accented once a category is set.
 */
export function CategoryTag(props: Omit<CategoryPickerProps, "trigger">) {
  const { t } = useTranslation();
  const { value } = props;
  return (
    <CategoryPicker
      {...props}
      trigger={
        <button
          type="button"
          className={cn(styles.cellBtn, styles.categoryTooltip, value && styles.noteOn)}
          data-tooltip={value || t("widgets.tagAdd")}
          aria-label={value ? t("widgets.tagEdit", { name: value }) : t("widgets.tagAdd")}
        >
          <Tag size={12} aria-hidden />
        </button>
      }
    />
  );
}
