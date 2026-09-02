import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { cn } from "@ui/common";
import { CategoryPicker, type CategoryPickerProps } from "./CategoryPicker";
import styles from "../widget.module.css";

/**
 * The small tag icon that sits in a cell's action row — the compact way to set the row's
 * category without giving the category a column of its own. Same picker as the dedicated
 * category cell; only the trigger is smaller.
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
          className={cn(styles.cellBtn, value && styles.tagBtnSet)}
          title={value || t("widgets.tagAdd")}
          aria-label={value ? t("widgets.tagEdit", { name: value }) : t("widgets.tagAdd")}
        >
          <Tag size={12} aria-hidden />
        </button>
      }
    />
  );
}
