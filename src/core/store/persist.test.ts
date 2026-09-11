import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ writeDoc: vi.fn(), subscribe: vi.fn() }));
vi.mock("../platform", () => ({ DOC_KEY: "doc", getStorage: () => ({ writeDoc: mocks.writeDoc }) }));
vi.mock("./store", () => ({ useStore: { subscribe: mocks.subscribe } }));
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); mocks.subscribe.mockReturnValue(() => {}); });

it("waits for an in-flight save and then writes the latest changes without overlap", async () => {
  const api = await import("./persist");
  const stop = api.startPersistence(60000);
  const change = mocks.subscribe.mock.calls[0][0];
  let finish!: () => void;
  mocks.writeDoc.mockImplementationOnce(() => new Promise<void>(r => { finish = r; })).mockResolvedValue(undefined);
  change({ doc: { value: 1 } }, { doc: {} });
  const first = api.flushPersistence();
  await vi.waitFor(() => expect(mocks.writeDoc).toHaveBeenCalledTimes(1));
  change({ doc: { value: 2 } }, { doc: {} });
  const second = api.flushPersistence();
  expect(mocks.writeDoc).toHaveBeenCalledTimes(1);
  finish(); await Promise.all([first, second]);
  expect(mocks.writeDoc.mock.calls.map(c => JSON.parse(c[1]).value)).toEqual([1, 2]);
  stop();
});

it("retains pending data after a failed save and rejects the install barrier", async () => {
  const api = await import("./persist");
  const stop = api.startPersistence(60000);
  mocks.subscribe.mock.calls[0][0]({ doc: { value: 3 } }, { doc: {} });
  mocks.writeDoc.mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
  await expect(api.flushPersistence()).rejects.toThrow("disk full");
  await api.flushPersistence();
  expect(mocks.writeDoc).toHaveBeenCalledTimes(2);
  expect(mocks.writeDoc.mock.calls[1][1]).toBe('{"value":3}');
  stop();
});
