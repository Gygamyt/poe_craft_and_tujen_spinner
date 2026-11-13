import { expect, it, vi } from "vitest";
import { catalogChannels, type CatalogDesktopApi } from "../../src/features/game-data/contracts";
const bridge = vi.hoisted(() => ({
  expose: vi.fn(),
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld: bridge.expose },
  ipcRenderer: bridge,
}));
import "../../src/preload";
it("exposes named catalog DTO operations without SQL, paths or generic IPC", async () => {
  const api = bridge.expose.mock.calls.find(
    ([name]) => name === "catalog",
  )![1] as CatalogDesktopApi;
  expect(Object.keys(api).sort()).toEqual(
    ["open", "status", "query", "detail", "activate", "chooseImport"].sort(),
  );
  await api.chooseImport();
  expect(bridge.invoke).toHaveBeenLastCalledWith(catalogChannels.import);
  await api.detail("mod", "modifier-id", "snapshot-id");
  expect(bridge.invoke).toHaveBeenLastCalledWith(catalogChannels.detail, {
    kind: "mod",
    id: "modifier-id",
    snapshotId: "snapshot-id",
  });
  bridge.invoke.mockRejectedValueOnce(new Error("catalog-unavailable"));
  await expect(api.status()).rejects.toThrow("catalog-unavailable");
});
