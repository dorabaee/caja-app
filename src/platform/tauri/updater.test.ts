import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn(), flush: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: mocks.isTauri }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("@core/store/persist", () => ({ flushPersistence: mocks.flush }));

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.stubEnv("DEV", false);
  mocks.isTauri.mockReturnValue(true);
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("window", { addEventListener: vi.fn() });
});

describe("desktop updater", () => {
  it("does not check in a browser or development build", async () => {
    const api = await import("./updater");
    mocks.isTauri.mockReturnValue(false);
    await api.checkForUpdates();
    mocks.isTauri.mockReturnValue(true); vi.stubEnv("DEV", true);
    await api.checkForUpdates();
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("deduplicates startup checks and allows retry after a failed check", async () => {
    const api = await import("./updater");
    mocks.check.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(null);
    api.startUpdateCheck(); api.startUpdateCheck();
    await vi.waitFor(() => expect(api.useUpdater.getState().phase).toBe("error"));
    expect(mocks.check).toHaveBeenCalledTimes(1);
    await api.checkForUpdates();
    expect(api.useUpdater.getState().phase).toBe("current");
  });
  it("downloads once and saves before installation and restart", async () => {
    const api = await import("./updater");
    const order: string[] = [];
    const update = {
      version: "0.3.0", close: vi.fn(),
      download: vi.fn(async (progress) => {
        order.push("download");
        progress({ event: "Started", data: { contentLength: 100 } });
        progress({ event: "Progress", data: { chunkLength: 50 } });
        expect(api.useUpdater.getState().percent).toBe(50);
      }),
      install: vi.fn(async () => { order.push("install"); }),
    };
    mocks.check.mockResolvedValue(update);
    mocks.flush.mockImplementation(async () => { order.push("save"); });
    mocks.relaunch.mockImplementation(async () => { order.push("restart"); });
    await api.checkForUpdates();
    await Promise.all([api.installUpdate(), api.installUpdate()]);
    expect(order).toEqual(["download", "save", "install", "restart"]);
    expect(update.download).toHaveBeenCalledTimes(1);
  });
  it("does not install when saving fails", async () => {
    const api = await import("./updater");
    const update = { version: "0.3.0", download: vi.fn(), install: vi.fn(), close: vi.fn() };
    mocks.check.mockResolvedValue(update);
    mocks.flush.mockRejectedValue(new Error("disk full"));
    await api.checkForUpdates(); await api.installUpdate();
    expect(update.install).not.toHaveBeenCalled();
    expect(mocks.relaunch).not.toHaveBeenCalled();
    expect(api.useUpdater.getState().phase).toBe("downloadError");
  });
  it("does not install an unverified or failed download", async () => {
    const api = await import("./updater");
    const update = { version: "0.3.0", download: vi.fn().mockRejectedValue(new Error("signature")), install: vi.fn() };
    mocks.check.mockResolvedValue(update);
    await api.checkForUpdates(); await api.installUpdate();
    expect(update.install).not.toHaveBeenCalled();
    expect(api.useUpdater.getState().phase).toBe("downloadError");
  });
  it("waits for a connection on startup and checks when it returns", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const api = await import("./updater");
    mocks.check.mockResolvedValue(null);
    api.startUpdateCheck();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(api.useUpdater.getState().phase).toBe("offline");
    const online = vi.mocked(window.addEventListener).mock.calls[0][1] as () => void;
    vi.stubGlobal("navigator", { onLine: true });
    online();
    await vi.waitFor(() => expect(api.useUpdater.getState().phase).toBe("current"));
    expect(mocks.check).toHaveBeenCalledTimes(1);
  });
  it("keeps a failed download available for retry without another check", async () => {
    const api = await import("./updater");
    const update = { version: "0.3.0", download: vi.fn().mockRejectedValueOnce(new Error("connection lost")).mockResolvedValue(undefined), install: vi.fn() };
    mocks.check.mockResolvedValue(update);
    await api.checkForUpdates(); await api.installUpdate();
    expect(api.useUpdater.getState().phase).toBe("downloadError");
    await api.installUpdate();
    expect(update.install).toHaveBeenCalledTimes(1);
    expect(mocks.check).toHaveBeenCalledTimes(1);
  });
});
