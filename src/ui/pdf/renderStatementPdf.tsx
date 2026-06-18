import { pdf } from "@react-pdf/renderer";
import type { Project, Settings } from "@core/model/types";
import { buildStatement, statementYear } from "@core/export";
import { StatementDocument } from "./StatementDocument";

function todayLabel(): string {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Render the "Estado de resultados" (all 3 formats, one file) to a PDF Blob.
 * @react-pdf is pulled in only through this module, which callers import
 * dynamically — so the renderer never lands in the initial bundle.
 */
export async function renderStatementPdf(project: Project, settings: Settings): Promise<Blob> {
  const statement = buildStatement(project);
  return pdf(
    <StatementDocument statement={statement} settings={settings} generatedAt={todayLabel()} />,
  ).toBlob();
}

/** Download filename, e.g. "Resumen-Tienda-de-Dona-Rosa-2026.pdf". */
export function statementFileName(project: Project): string {
  const slug = (project.name?.trim() || "Negocio")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `Resumen-${slug || "Negocio"}-${statementYear(project)}.pdf`;
}
