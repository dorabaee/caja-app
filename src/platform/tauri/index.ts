import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { BlobMeta, FileDialog, Platform, ShareAdapter, StorageAdapter } from "@core/platform";

const BASE = { baseDir: BaseDirectory.AppData } as const;
const ROOT = "data";
const RECEIPTS = `${ROOT}/receipts`;

function sanitize(key: string): string {
  return key.replace(/[^a-z0-9._-]/gi, "_");
}
function docPath(key: string): string {
  return `${ROOT}/${sanitize(key)}.json`;
}

async function ensureDir(dir: string): Promise<void> {
  if (!(await exists(dir, BASE))) {
    await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

const storage: StorageAdapter = {
  async readDoc(key) {
    const p = docPath(key);
    if (!(await exists(p, BASE))) return null;
    return readTextFile(p, BASE);
  },
  async writeDoc(key, value) {
    await ensureDir(ROOT);
    await writeTextFile(docPath(key), value, BASE);
  },
  async putBlob(id, data, meta) {
    await ensureDir(RECEIPTS);
    const buf = new Uint8Array(await data.arrayBuffer());
    await writeFile(`${RECEIPTS}/${id}`, buf, BASE);
    await writeTextFile(`${RECEIPTS}/${id}.meta.json`, JSON.stringify({ id, ...meta }), BASE);
  },
  async getBlob(id) {
    const path = `${RECEIPTS}/${id}`;
    if (!(await exists(path, BASE))) return null;
    const bytes = await readFile(path, BASE);
    let mime = "application/octet-stream";
    const metaPath = `${path}.meta.json`;
    if (await exists(metaPath, BASE)) {
      try {
        mime = (JSON.parse(await readTextFile(metaPath, BASE)) as BlobMeta).mime || mime;
      } catch {
        /* ignore */
      }
    }
    return new Blob([bytes], { type: mime });
  },
  async deleteBlob(id) {
    for (const p of [`${RECEIPTS}/${id}`, `${RECEIPTS}/${id}.meta.json`]) {
      if (await exists(p, BASE)) await remove(p, BASE);
    }
  },
  async listBlobs() {
    if (!(await exists(RECEIPTS, BASE))) return [];
    const entries = await readDir(RECEIPTS, BASE);
    const out: BlobMeta[] = [];
    for (const e of entries) {
      if (!e.name.endsWith(".meta.json")) continue;
      try {
        out.push(JSON.parse(await readTextFile(`${RECEIPTS}/${e.name}`, BASE)) as BlobMeta);
      } catch {
        /* ignore */
      }
    }
    return out;
  },
};

const dialog: FileDialog = {
  async saveFile({ suggestedName, data, filters }) {
    const path = await saveDialog({ defaultPath: suggestedName, filters });
    if (!path) return false;
    if (typeof data === "string") await writeTextFile(path, data);
    else await writeFile(path, new Uint8Array(await data.arrayBuffer()));
    return true;
  },
  async openFile(filters) {
    const path = await openDialog({ multiple: false, directory: false, filters });
    if (!path || Array.isArray(path)) return null;
    const name = path.split(/[\\/]/).pop() ?? path;
    return {
      name,
      text: () => readTextFile(path),
      bytes: () => readFile(path),
    };
  },
};

const share: ShareAdapter = {
  async openExternal(url) {
    await openUrl(url);
  },
};

export function createTauriPlatform(): Platform {
  return { name: "tauri", storage, dialog, share };
}
