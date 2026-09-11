import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { flushPersistence } from "@core/store/persist";

type Phase = "idle" | "checking" | "current" | "available" | "downloading" | "installing" | "restart" | "error";
export const useUpdater = create<{ phase: Phase; version: string; percent: number | null }>(() => ({
  phase: "idle", version: "", percent: null,
}));
let update: Update | null = null;
let started = false;
export const supportsUpdates = () => isTauri() && !import.meta.env.DEV;

export function startUpdateCheck(): void {
  if (started || !supportsUpdates()) return;
  started = true;
  void checkForUpdates();
}

export async function checkForUpdates(): Promise<void> {
  if (!supportsUpdates() || ["checking", "downloading", "installing", "restart"].includes(useUpdater.getState().phase)) return;
  useUpdater.setState({ phase: "checking", percent: null });
  try {
    if (update) await update.close();
    update = null;
    update = await check({ timeout: 15000 });
    useUpdater.setState({ phase: update ? "available" : "current", version: update?.version ?? "" });
  } catch (error) {
    console.warn("Caja: update check failed", error);
    useUpdater.setState({ phase: "error" });
  }
}

export async function installUpdate(): Promise<void> {
  if (!update || useUpdater.getState().phase !== "available") return;
  useUpdater.setState({ phase: "downloading", percent: null });
  try {
    let received = 0;
    let total = 0;
    await update.download((event) => {
      if (event.event === "Started") { total = event.data.contentLength ?? 0; received = 0; }
      if (event.event === "Progress") {
        received += event.data.chunkLength;
        useUpdater.setState({ percent: total > 0 ? Math.min(99, Math.floor(received / total * 100)) : null });
      }
    }, { timeout: 120000 });
    // Windows exits from install(): persist before handing control to the installer.
    useUpdater.setState({ phase: "installing", percent: 100 });
    await flushPersistence();
    await update.install();
    useUpdater.setState({ phase: "restart" });
    await relaunch();
  } catch (error) {
    console.warn("Caja: update failed", error);
    // A completed install must only retry restarting, never reinstall the same resource.
    if (useUpdater.getState().phase !== "restart") useUpdater.setState({ phase: "error", percent: null });
  }
}

export async function retryRestart(): Promise<void> {
  try { await flushPersistence(); await relaunch(); }
  catch (error) { console.warn("Caja: restart failed", error); }
}
