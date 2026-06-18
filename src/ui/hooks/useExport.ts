import { useTranslation } from "react-i18next";
import { getDialog } from "@core/platform";
import { useStore, useUI } from "@core/store";
import type { Project } from "@core/model/types";
import {
  allBusinessesToCsv,
  applyBackup,
  buildAllBusinessesWorkbookBlob,
  buildProjectWorkbookBlob,
  createBackup,
  parseBackup,
  resumenToCsv,
  statementYear,
} from "@core/export";
import type { FileFilter } from "@core/platform";

/** UTF-8 BOM so Excel renders accented text (Doña, según) correctly from CSV. */
const BOM = "﻿";
const PDF: FileFilter[] = [{ name: "PDF", extensions: ["pdf"] }];
const CSV: FileFilter[] = [{ name: "CSV", extensions: ["csv"] }];
const XLSX: FileFilter[] = [{ name: "Excel", extensions: ["xlsx"] }];
const BACKUP: FileFilter[] = [{ name: "Respaldo de Caja", extensions: ["json"] }];

function slugify(name: string): string {
  const slug = (name?.trim() || "Negocio")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "Negocio";
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Every file-producing action in one place: PDF / CSV / Excel exports, plus
 * backup & restore. Each routes through the active platform's save dialog and
 * reports the result via a toast. All numbers come from the compute layer, so
 * exports always match what's on screen.
 */
export function useExport() {
  const { t } = useTranslation();
  const settings = useStore((s) => s.doc.settings);
  const toast = useUI((s) => s.toast);

  async function runSave(name: string, data: Blob | string, filters: FileFilter[]): Promise<boolean> {
    return getDialog().saveFile({ suggestedName: name, data, filters });
  }

  async function exportStatementPdf(project: Project): Promise<void> {
    try {
      const { renderStatementPdf, statementFileName } = await import("@ui/pdf");
      const blob = await renderStatementPdf(project, settings);
      if (await runSave(statementFileName(project), blob, PDF)) toast(t("modals.toastPdfSaved"), "success");
    } catch (e) {
      console.error("export pdf", e);
      toast(t("modals.toastPdfError"), "error");
    }
  }

  async function exportResumenCsv(project: Project): Promise<void> {
    try {
      const csv = BOM + resumenToCsv(project, { decimals: settings.decimals });
      const name = `Resumen-${slugify(project.name)}-${statementYear(project)}.csv`;
      if (await runSave(name, csv, CSV)) toast(t("modals.toastCsvSaved"), "success");
    } catch (e) {
      console.error("export csv", e);
      toast(t("modals.toastCsvError"), "error");
    }
  }

  async function exportResumenExcel(project: Project): Promise<void> {
    try {
      const blob = await buildProjectWorkbookBlob(project);
      const name = `Resumen-${slugify(project.name)}-${statementYear(project)}.xlsx`;
      if (await runSave(name, blob, XLSX)) toast(t("modals.toastExcelSaved"), "success");
    } catch (e) {
      console.error("export xlsx", e);
      toast(t("modals.toastExcelError"), "error");
    }
  }

  async function exportAllBusinessesCsv(projects: Project[]): Promise<void> {
    try {
      const csv = BOM + allBusinessesToCsv(projects, { decimals: settings.decimals });
      if (await runSave(`Todos-los-negocios-${stamp()}.csv`, csv, CSV)) toast(t("modals.toastCsvSaved"), "success");
    } catch (e) {
      console.error("export csv all", e);
      toast(t("modals.toastCsvError"), "error");
    }
  }

  async function exportAllBusinessesExcel(projects: Project[]): Promise<void> {
    try {
      const blob = await buildAllBusinessesWorkbookBlob(projects);
      if (await runSave(`Todos-los-negocios-${stamp()}.xlsx`, blob, XLSX)) toast(t("modals.toastExcelSaved"), "success");
    } catch (e) {
      console.error("export xlsx all", e);
      toast(t("modals.toastExcelError"), "error");
    }
  }

  async function exportBackup(): Promise<void> {
    try {
      const text = await createBackup();
      if (await runSave(`Caja-respaldo-${stamp()}.json`, text, BACKUP)) toast(t("modals.toastBackupSaved"), "success");
    } catch (e) {
      console.error("backup", e);
      toast(e instanceof Error ? e.message : t("modals.toastBackupError"), "error");
    }
  }

  /** Restore replaces ALL current data — callers should confirm first. */
  async function restoreBackup(): Promise<void> {
    try {
      const file = await getDialog().openFile(BACKUP);
      if (!file) return;
      const parsed = parseBackup(await file.text());
      const doc = await applyBackup(parsed);
      useStore.getState().load(doc);
      toast(t("modals.toastBackupRestored"), "success");
    } catch (e) {
      console.error("restore", e);
      toast(e instanceof Error ? e.message : t("modals.toastRestoreError"), "error");
    }
  }

  return {
    exportStatementPdf,
    exportResumenCsv,
    exportResumenExcel,
    exportAllBusinessesCsv,
    exportAllBusinessesExcel,
    exportBackup,
    restoreBackup,
  };
}
