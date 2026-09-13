import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Table } from "@core/model/types";
import { IconButton } from "@ui/common";
import { TemplatePreview } from "@ui/app/TemplatePreview";

export function TableHelp({ table }: { table: Table }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const template = table.kind === "ledger" ? "ledger" : table.kind === "none" ? "blank" : table.kind;
  const context = t(`shell.tableHelp.${table.kind}`, { name: table.title }) + (table.fiscal ? ` ${t("shell.tableHelp.fiscal")}` : "");
  return <>
    <IconButton label={t("shell.tableHelp.label", { name: table.title })} icon={<HelpCircle />} size="sm" tone="info" portalTooltip onClick={() => setOpen(true)} />
    <TemplatePreview open={open} template={template} context={context} onClose={() => setOpen(false)} />
  </>;
}
