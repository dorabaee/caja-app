import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  readTextFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { FileDialog, Platform, ShareAdapter, StorageAdapter } from "@core/platform";

const BASE = { baseDir: BaseDirectory.AppData } as const;
const ROOT = "data";

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
