import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignCenterVertical,
  AlignCenterHorizontal,
  Copy,
  Trash2,
  X,
} from "lucide-react";
import type { Month, WidgetLayout } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { IconButton } from "@ui/common";
import styles from "./SelectionToolbar.module.css";

interface Item {
  id: string;
  layout: WidgetLayout;
}

/** Where each selected widget should move to for a given alignment. */
function alignPositions(items: Item[], mode: string): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const left = Math.min(...items.map((i) => i.layout.x));
  const right = Math.max(...items.map((i) => i.layout.x + i.layout.w));
  const top = Math.min(...items.map((i) => i.layout.y));
  const bottom = Math.max(...items.map((i) => i.layout.y + i.layout.h));
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  for (const it of items) {
    const { x, y, w, h } = it.layout;
    switch (mode) {
      case "left":
        out[it.id] = { x: left, y };
        break;
      case "hcenter":
        out[it.id] = { x: Math.round(cx - w / 2), y };
        break;
      case "right":
        out[it.id] = { x: right - w, y };
        break;
      case "top":
        out[it.id] = { x, y: top };
        break;
      case "vcenter":
        out[it.id] = { x, y: Math.round(cy - h / 2) };
        break;
      case "bottom":
        out[it.id] = { x, y: bottom - h };
        break;
      default:
        out[it.id] = { x, y };
    }
  }
  return out;
}

/** Even gaps between the selected widgets along one axis, outer two staying put. */
function distributePositions(items: Item[], axis: "x" | "y"): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const size = axis === "x" ? ("w" as const) : ("h" as const);
  const sorted = [...items].sort((a, b) => a.layout[axis] - b.layout[axis]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last.layout[axis] + last.layout[size] - first.layout[axis];
  const used = sorted.reduce((sum, it) => sum + it.layout[size], 0);
  const gap = (span - used) / (sorted.length - 1);
  let cursor = first.layout[axis];
  for (const it of sorted) {
    out[it.id] =
      axis === "x"
        ? { x: Math.round(cursor), y: it.layout.y }
        : { x: it.layout.x, y: Math.round(cursor) };
    cursor += it.layout[size] + gap;
  }
  return out;
}

/**
 * Floats over the canvas whenever two or more widgets are selected: align, distribute,
 * duplicate and delete, applied to the whole selection in one undoable step each.
 */
export function SelectionToolbar({ monthIndex, month }: { monthIndex: number; month: Month }) {
  const { t } = useTranslation();
  const selectedIds = useUI((s) => s.selectedIds);
  const selectMany = useUI((s) => s.selectMany);
  const clearSelection = useUI((s) => s.clearSelection);

  const items = useMemo(
    () =>
      [...month.tables, ...month.charts]
        .filter((w) => selectedIds.has(w.id))
        .map((w) => ({ id: w.id, layout: w.layout })),
    [month.tables, month.charts, selectedIds],
  );

  if (items.length < 2) return null;

  const apply = (positions: Record<string, { x: number; y: number }>) => {
    const s = useStore.getState();
    for (const [id, pos] of Object.entries(positions)) s.setWidgetLayout(monthIndex, id, pos);
  };

  const align = (mode: string) => apply(alignPositions(items, mode));

  return (
    <div className={styles.bar} role="toolbar" aria-label={t("month.selectionTools")}>
      <span className={styles.count}>{t("month.selectedCount", { count: items.length })}</span>
      <span className={styles.sep} aria-hidden />

      <IconButton label={t("month.alignLeft")} icon={<AlignStartVertical />} size="sm" onClick={() => align("left")} />
      <IconButton label={t("month.alignHCenter")} icon={<AlignCenterVertical />} size="sm" onClick={() => align("hcenter")} />
      <IconButton label={t("month.alignRight")} icon={<AlignEndVertical />} size="sm" onClick={() => align("right")} />
      <span className={styles.sep} aria-hidden />
      <IconButton label={t("month.alignTop")} icon={<AlignStartHorizontal />} size="sm" onClick={() => align("top")} />
      <IconButton label={t("month.alignVCenter")} icon={<AlignCenterHorizontal />} size="sm" onClick={() => align("vcenter")} />
      <IconButton label={t("month.alignBottom")} icon={<AlignEndHorizontal />} size="sm" onClick={() => align("bottom")} />

      {items.length > 2 && (
        <>
          <span className={styles.sep} aria-hidden />
          <IconButton
            label={t("month.distributeH")}
            icon={<AlignHorizontalJustifyCenter />}
            size="sm"
            onClick={() => apply(distributePositions(items, "x"))}
          />
          <IconButton
            label={t("month.distributeV")}
            icon={<AlignVerticalJustifyCenter />}
            size="sm"
            onClick={() => apply(distributePositions(items, "y"))}
          />
        </>
      )}

      <span className={styles.sep} aria-hidden />
      <IconButton
        label={t("common.duplicate")}
        icon={<Copy />}
        size="sm"
        onClick={() => selectMany(useStore.getState().duplicateWidgets(monthIndex, [...selectedIds]))}
      />
      <IconButton
        label={t("month.deleteSelected", { count: items.length })}
        icon={<Trash2 />}
        size="sm"
        className={styles.danger}
        onClick={() => {
          useStore.getState().removeWidgets(monthIndex, [...selectedIds]);
          clearSelection();
        }}
      />
      <IconButton label={t("common.close")} icon={<X />} size="sm" onClick={clearSelection} />
    </div>
  );
}
