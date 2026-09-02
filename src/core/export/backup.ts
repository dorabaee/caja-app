import { DOC_KEY, getStorage } from "../platform";
import type { AppDoc } from "../model/types";
import { CURRENT_SCHEMA_VERSION } from "../model/types";
import { applyViewPrefs, getViewPrefs, type ViewPrefs } from "../store/ui";
export type { ViewPrefs };
import { useStore } from "../store/store";

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
  /** View preferences (last month, zoom, sidebar order/collapsed) — optional so an
   *  older backup file, which never wrote this, still restores exactly as it did before. */
  prefs?: ViewPrefs;
}

export interface ParsedBackup {
  doc: AppDoc;
  blobs: BackupBlob[];
  exportedAt: string;
  prefs?: ViewPrefs;
}

const INVALID = "El archivo no es un respaldo válido de Caja.";

// ---- pure (testable) --------------------------------------------------------

export function serializeBackup(
  doc: AppDoc,
  blobs: BackupBlob[],
  exportedAt: string,
  prefs?: ViewPrefs,
): string {
  const file: BackupFile = {
    app: "caja",
    kind: "backup",
    version: BACKUP_VERSION,
    schemaVersion: doc.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    exportedAt,
    doc,
    blobs,
    ...(prefs ? { prefs } : {}),
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
  const prefsRaw = (raw as BackupFile).prefs;
  const prefs =
    prefsRaw && typeof prefsRaw === "object" ? (prefsRaw as ViewPrefs) : undefined;
  return { doc, blobs, exportedAt, ...(prefs ? { prefs } : {}) };
}

// ---- IO (uses the active StorageAdapter) ------------------------------------

/**
 * Gather the current doc into a portable backup string. Serializes from the LIVE store
 * rather than the last value written to storage: persistence is debounced (500ms), so a
 * backup taken right after an edit would otherwise miss it.
 */
export async function createBackup(): Promise<string> {
  const doc = useStore.getState().doc;
  if (!doc.projects.length) throw new Error("Todavía no hay datos para respaldar.");
  return serializeBackup(doc, [], new Date().toISOString(), getViewPrefs());
}

/**
 * Restore a parsed backup into storage and the live store; returns the doc so the caller
 * can reload. A legacy backup's `blobs` are ignored (the attachment feature was removed)
 * — this is the compatibility guard that lets old `.caja.json` files restore without
 * error. A backup with no `prefs` block (any backup made before this field existed)
 * leaves view preferences untouched, so it restores exactly as it did before.
 */
export async function applyBackup(parsed: ParsedBackup): Promise<AppDoc> {
  const storage = getStorage();
  await storage.writeDoc(DOC_KEY, JSON.stringify(parsed.doc));
  if (parsed.prefs) applyViewPrefs(parsed.prefs);
  return parsed.doc;
}
