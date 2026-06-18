import { DOC_KEY, getStorage } from "../platform";
import type { AppDoc } from "../model/types";
import { CURRENT_SCHEMA_VERSION } from "../model/types";

/**
 * Backup / restore — a single self-contained `.caja.json` file holding the whole
 * AppDoc plus any binary blobs (receipts, base64-inlined). Blobs aren't created
 * until M8, so today the file is effectively the doc; the format already carries
 * them so an old backup keeps restoring once receipts exist.
 */

export const BACKUP_VERSION = 1;

export interface BackupBlob {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** base64-encoded bytes. */
  data: string;
}

export interface BackupFile {
  app: "caja";
  kind: "backup";
  version: number;
  schemaVersion: number;
  exportedAt: string;
  doc: AppDoc;
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
  const blobs = Array.isArray((raw as BackupFile).blobs) ? (raw as BackupFile).blobs : [];
  const exportedAt =
    typeof (raw as BackupFile).exportedAt === "string" ? (raw as BackupFile).exportedAt : "";
  return { doc, blobs, exportedAt };
}

// ---- base64 <-> Blob --------------------------------------------------------

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBlob(data: string, mime: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---- IO (uses the active StorageAdapter) ------------------------------------

/** Gather the current doc + blobs into a portable backup string. */
export async function createBackup(): Promise<string> {
  const storage = getStorage();
  const docText = await storage.readDoc(DOC_KEY);
  if (!docText) throw new Error("Todavía no hay datos para respaldar.");
  const doc = JSON.parse(docText) as AppDoc;

  const blobs: BackupBlob[] = [];
  for (const meta of await storage.listBlobs()) {
    const blob = await storage.getBlob(meta.id);
    if (!blob) continue;
    blobs.push({ id: meta.id, name: meta.name, mime: meta.mime, size: meta.size, data: await blobToBase64(blob) });
  }
  return serializeBackup(doc, blobs, new Date().toISOString());
}

/** All blob ids still referenced by a row attachment anywhere in the doc. */
function referencedBlobIds(doc: AppDoc): Set<string> {
  const ids = new Set<string>();
  for (const p of doc.projects)
    for (const m of p.months)
      for (const tbl of m.tables)
        for (const r of tbl.rows)
          for (const a of r.attachments ?? []) ids.add(a.id);
  return ids;
}

/**
 * Delete blobs no longer referenced by any attachment — orphans left behind when
 * a row/table/project (or its attachments) was removed. Safe to run at boot, when
 * the undo history is empty so a deletion can't be undone back into existence.
 * Returns how many blobs were removed.
 */
export async function gcBlobs(): Promise<number> {
  const storage = getStorage();
  const docText = await storage.readDoc(DOC_KEY);
  if (!docText) return 0;
  let doc: AppDoc;
  try {
    doc = JSON.parse(docText) as AppDoc;
  } catch {
    return 0;
  }
  const referenced = referencedBlobIds(doc);
  let removed = 0;
  for (const meta of await storage.listBlobs()) {
    if (!referenced.has(meta.id)) {
      await storage.deleteBlob(meta.id);
      removed += 1;
    }
  }
  return removed;
}

/** Restore a parsed backup into storage; returns the doc so the caller can reload the store. */
export async function applyBackup(parsed: ParsedBackup): Promise<AppDoc> {
  const storage = getStorage();
  await storage.writeDoc(DOC_KEY, JSON.stringify(parsed.doc));
  for (const b of parsed.blobs) {
    await storage.putBlob(b.id, base64ToBlob(b.data, b.mime), {
      name: b.name,
      mime: b.mime,
      size: b.size,
    });
  }
  return parsed.doc;
}
