import { useTranslation } from "react-i18next";
import { MoreVertical, ArrowRightLeft } from "lucide-react";
import type { KpiTableContribution } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";

/**
 * Per-KPI breakdown menu (#12): lists the tables feeding Entró / Salió with their
 * contribution, lets you opt a table out of the total (ephemeral), or reclassify it to
 * the other KPI (undoable setTableKind).
 */
export function KpiBreakdownMenu({
  kind,
  contributions,
  monthIndex,
}: {
  kind: "income" | "expense";
  contributions: KpiTableContribution[];
  monthIndex: number;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const s = useStore.getState;
  const toggleKpiExclusion = useUI((u) => u.toggleKpiExclusion);

  if (!contributions.length) return null;

  const kpiLabel = kind === "income" ? t("month.entro") : t("month.salio");
  const otherKind = kind === "income" ? "expense" : "income";
  const otherLabel = kind === "income" ? t("month.salio") : t("month.entro");

  return (
    <Menu
      align="end"
      minWidth={244}
      trigger={
        <IconButton label={t("month.kpiOptions", { label: kpiLabel })} icon={<MoreVertical />} size="sm" />
      }
    >
      <MenuLabel>{t("month.kpiContributors", { label: kpiLabel })}</MenuLabel>
      {contributions.map((c) => (
        <MenuItem key={c.tableId} checked={!c.excluded} onClick={() => toggleKpiExclusion(c.tableId)}>
          {c.title} · {fmt.moneyPlain(c.total)}
        </MenuItem>
      ))}
      <MenuSeparator />
      {contributions.map((c) => (
        <MenuItem
          key={c.tableId}
          icon={<ArrowRightLeft />}
          onClick={() => s().setTableKind(monthIndex, c.tableId, otherKind)}
        >
          {t("month.kpiMoveTo", { title: c.title, kpi: otherLabel })}
        </MenuItem>
      ))}
    </Menu>
  );
}
