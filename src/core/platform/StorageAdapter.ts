// Platform contracts. `core` depends only on these interfaces — never on Tauri or
// browser APIs directly. Concrete impls live in src/platform/{tauri,web}.

export interface BlobMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface StorageAdapter {
  /** Structured app document (the big JSON). */
  readDoc(key: string): Promise<string | null>;
  writeDoc(key: string, value: string): Promise<void>;

  /** Binary blobs (receipts/photos), addressed by opaque id. */
  putBlob(id: string, data: Blob, meta: Omit<BlobMeta, "id">): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  deleteBlob(id: string): Promise<void>;
  listBlobs(): Promise<BlobMeta[]>;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileOptions {
  suggestedName: string;
  data: Blob | string;
  filters?: FileFilter[];
}

export interface OpenedFile {
  name: string;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
}

export interface FileDialog {
  /** Returns true if saved, false if cancelled. */
  saveFile(opts: SaveFileOptions): Promise<boolean>;
  openFile(filters?: FileFilter[]): Promise<OpenedFile | null>;
}

export interface ShareAdapter {
  /** Open a URL (mailto:, https://wa.me/..., https://...) in the OS browser/app. */
  openExternal(url: string): Promise<void>;
}

export interface Platform {
  name: "tauri" | "web";
  storage: StorageAdapter;
  dialog: FileDialog;
  share: ShareAdapter;
}

export const DOC_KEY = "caja:doc";
