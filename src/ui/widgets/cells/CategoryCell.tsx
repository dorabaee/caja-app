import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { cn } from "@ui/common";
import { useChartColors } from "@ui/hooks/useChartColors";
import { CategoryPicker, type CategoryPickerProps } from "./CategoryPicker";
import styles from "../widget.module.css";

/** The category as a colored chip — the same token in the table and in the Resumen. */
export function CategoryChip({ name, muted }: { name: string; muted?: boolean }) {
  const { t } = useTranslation();
  const colors = useChartColors();
  if (!name) {
    return (
      <span className={cn(styles.catChip, styles.catChipEmpty)}>
        <Tag size={11} aria-hidden />
        {t("widgets.categoryEmpty")}
      </span>
    );
  }
  return (
    <span
      className={cn(styles.catChip, muted && styles.catChipMuted)}
      style={{ "--cat-color": colors.categoryColor(name, colors.palette === "colorful") } as CSSProperties}
    >
      <span className={styles.catChipDot} aria-hidden />
      <span className={styles.catChipName}>{name}</span>
    </span>
  );
}

/**
 * A whole cell that is nothing but the category. There is no text to type and no amount
 * to enter — clicking anywhere in it opens the picker. Used by a dedicated
 * `type: "category"` column, and by a `withCategory` column while it shows its category
 * face.
 */
export function CategoryCell({
  disabled,
  danger,
  staged,
  actions,
  ...picker
}: Omit<CategoryPickerProps, "trigger"> & {
  disabled?: boolean;
  danger?: boolean;
  staged?: boolean;
  /** Extra buttons pinned to the cell (e.g. the description/category switch). */
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const chip = <CategoryChip name={picker.value} />;
  return (
    <div
      className={cn(
        styles.cell,
        styles.catCell,
        danger && styles.cellDanger,
        staged && styles.cellStaged,
      )}
    >
      {disabled ? (
        <span className={styles.catCellStatic}>{chip}</span>
      ) : (
        <CategoryPicker
          {...picker}
          trigger={
            <button
              type="button"
              className={styles.catCellBtn}
              title={t("widgets.categoryCellHint")}
              aria-label={
                picker.value ? t("widgets.tagEdit", { name: picker.value }) : t("widgets.tagAdd")
              }
            >
              {chip}
            </button>
          }
        />
      )}
      {actions}
    </div>
  );
}
