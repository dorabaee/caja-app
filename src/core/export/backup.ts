import { DOC_KEY, getStorage } from "../platform";
import type { AppDoc } from "../model/types";
import { CURRENT_SCHEMA_VERSION } from "../model/types";

/**
 * Backup / restore — a single self-contained `.caja.json` file holding the whole
 * AppDoc. The receipt-attachment feature was removed, so new backups carry no blobs;
 * the `blobs` field is kept in the format and PARSED for backward compatibility, but
 * ignored on restore (old backups still load without error).
 */

export const BACKUP_VERSION = 1;

export interface BackupBlob {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** base64-encoded bytes (legacy only). */
  data: string;
}

export interface BackupFile {
  app: "caja";
  kind: "backup";
  version: number;
  schemaVersion: number;
  exportedAt: string;
  doc: AppDoc;
  /** Legacy attachment payload — always [] in new backups, ignored on restore. */
  blobs: BackupBlob[];
}

export interface ParsedBackup {
  doc: AppDoc;
  blobs: BackupBlob[];
  exportedAt: string;
}

const INVALID = "El archivo no es un respaldo válido de Caja.";

// ---- pure (testable) --------------------------------------------------------

export function serializeBackup(doc: AppDoc, blobs: BackupBlob[], exportedAt: string): string {
  const file: BackupFile = {
    app: "caja",
    kind: "backup",
    version: BACKUP_VERSION,
    schemaVersion: doc.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    exportedAt,
    doc,
    blobs,
  };
  return JSON.stringify(file, null, 2);
}

function looksLikeDoc(doc: unknown): doc is AppDoc {
  return (
    typeof doc === "object" &&
    doc !== null &&
    Array.isArray((doc as AppDoc).projects) &&
    typeof (doc as AppDoc).settings === "object" &&
    (doc as AppDoc).settings !== null
  );
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(INVALID);
  }
  if (typeof raw !== "object" || raw === null || (raw as BackupFile).app !== "caja") {
    throw new Error(INVALID);
  }
  const doc = (raw as BackupFile).doc;
  if (!looksLikeDoc(doc)) throw new Error("El respaldo no contiene datos de Caja.");
  // Tolerate (but ignore) a legacy blobs array so old backups still parse.
  const blobs = Array.isArray((raw as BackupFile).blobs) ? (raw as BackupFile).blobs : [];
  const exportedAt =
    typeof (raw as BackupFile).exportedAt === "string" ? (raw as BackupFile).exportedAt : "";
  return { doc, blobs, exportedAt };
}

// ---- IO (uses the active StorageAdapter) ------------------------------------

/** Gather the current doc into a portable backup string. */
export async function createBackup(): Promise<string> {
  const storage = getStorage();
  const docText = await storage.readDoc(DOC_KEY);
  if (!docText) throw new Error("Todavía no hay datos para respaldar.");
  const doc = JSON.parse(docText) as AppDoc;
  return serializeBackup(doc, [], new Date().toISOString());
}

/**
 * Restore a parsed backup into storage; returns the doc so the caller can reload.
 * A legacy backup's `blobs` are ignored (the attachment feature was removed) — this
 * is the compatibility guard that lets old `.caja.json` files restore without error.
 */
export async function applyBackup(parsed: ParsedBackup): Promise<AppDoc> {
  const storage = getStorage();
  await storage.writeDoc(DOC_KEY, JSON.stringify(parsed.doc));
  return parsed.doc;
}
