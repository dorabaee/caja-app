import { DOC_KEY, getStorage, setPlatform } from "@core/platform";
import { importLegacy } from "@core/migration/importLegacy";
import { migrateDoc } from "@core/migration/migrateDoc";
import { defaultSettings, newAppDoc } from "@core/model/defaults";
import type { AppDoc } from "@core/model/types";
import { startPersistence, useStore } from "@core/store";
import { createWebPlatform } from "@platform/web";
import { applyTheme } from "@ui/theme/applyTheme";
import { setLocale } from "@core/i18n/config";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Composition root: choose platform, load/migrate the doc, hydrate store, start persistence. */
export async function boot(): Promise<void> {
  if (isTauri()) {
    const { createTauriPlatform } = await import("@platform/tauri");
    setPlatform(createTauriPlatform());
  } else {
    setPlatform(createWebPlatform());
  }

  const storage = getStorage();
  let doc: AppDoc | null = null;

  const raw = await storage.readDoc(DOC_KEY);
  if (raw) {
    try {
      doc = JSON.parse(raw) as AppDoc;
    } catch {
      doc = null;
    }
  }

  if (!doc) {
    const legacy = importLegacy();
    if (legacy) {
      doc = legacy;
      await storage.writeDoc(DOC_KEY, JSON.stringify(doc));
    }
  }

  if (!doc) doc = newAppDoc();
  doc = migrateDoc(doc);
  doc.settings = { ...defaultSettings(), ...doc.settings };

  applyTheme(doc.settings);
  setLocale(doc.settings.locale);
  useStore.getState().load(doc);
  startPersistence(500);
}
