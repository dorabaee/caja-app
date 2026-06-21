import { createStore, get, set } from "idb-keyval";
import type { FileDialog, OpenedFile, Platform, StorageAdapter, ShareAdapter } from "@core/platform";

const docStore = createStore("caja", "doc");

const storage: StorageAdapter = {
  async readDoc(key) {
    return (await get<string>(key, docStore)) ?? null;
  },
  async writeDoc(key, value) {
    await set(key, value, docStore);
  },
};

const dialog: FileDialog = {
  async saveFile({ suggestedName, data }) {
    const blob =
      typeof data === "string" ? new Blob([data], { type: "text/plain;charset=utf-8" }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  },
  openFile(filters) {
    return new Promise<OpenedFile | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      if (filters?.length) {
        input.accept = filters.flatMap((f) => f.extensions.map((e) => "." + e)).join(",");
      }
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        resolve({
          name: file.name,
          text: () => file.text(),
          bytes: async () => new Uint8Array(await file.arrayBuffer()),
        });
      };
      input.click();
    });
  },
};

const share: ShareAdapter = {
  async openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  },
};

export function createWebPlatform(): Platform {
  return { name: "web", storage, dialog, share };
}
