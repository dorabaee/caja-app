import type { FileDialog, Platform, ShareAdapter, StorageAdapter } from "./StorageAdapter";

export * from "./StorageAdapter";

let current: Platform | null = null;

export function setPlatform(platform: Platform): void {
  current = platform;
}

export function getPlatform(): Platform {
  if (!current) throw new Error("Platform not initialized — call setPlatform() during boot.");
  return current;
}

export function getStorage(): StorageAdapter {
  return getPlatform().storage;
}

export function getDialog(): FileDialog {
  return getPlatform().dialog;
}

export function getShare(): ShareAdapter {
  return getPlatform().share;
}
