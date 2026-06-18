import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet, FileText, Share2, Table } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { Button, Menu, MenuItem, MenuSeparator } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useExport } from "@ui/hooks/useExport";

/** Top-bar "Exportar" menu, shown on the Panel / Resumen / Todos los negocios views. */
export function ExportMenu() {
  const { t } = useTranslation();
  const nav = useUI((s) => s.nav);
  const openModal = useUI((s) => s.openModal);
  const project = useCurrentProject();
  const projects = useStore((s) => s.doc.projects);
  const exp = useExport();

  const trigger = (
    <Button variant="ghost" icon={<Download />}>
      {t("shell.export")}
    </Button>
  );

  if (nav === "allBiz") {
    return (
      <Menu trigger={trigger} align="end" minWidth={236}>
        <MenuItem icon={<FileSpreadsheet />} onClick={() => exp.exportAllBusinessesExcel(projects)}>
          {t("shell.exportAllExcel")}
        </MenuItem>
        <MenuItem icon={<Table />} onClick={() => exp.exportAllBusinessesCsv(projects)}>
          {t("shell.exportAllCsv")}
        </MenuItem>
      </Menu>
    );
  }

  return (
    <Menu trigger={trigger} align="end" minWidth={236}>
      <MenuItem icon={<FileText />} onClick={() => project && exp.exportStatementPdf(project)}>
        {t("shell.exportStatementPdf")}
      </MenuItem>
      <MenuItem icon={<Table />} onClick={() => project && exp.exportResumenCsv(project)}>
        {t("shell.exportResumenCsv")}
      </MenuItem>
      <MenuItem icon={<FileSpreadsheet />} onClick={() => project && exp.exportResumenExcel(project)}>
        {t("shell.exportResumenExcel")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Share2 />} onClick={() => openModal("share")}>
        {t("shell.shareEllipsis")}
      </MenuItem>
    </Menu>
  );
}
