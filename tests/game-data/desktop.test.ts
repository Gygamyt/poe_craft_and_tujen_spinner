import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  windows: [] as unknown[],
  dialog: vi.fn(),
  status: vi.fn(),
  query: vi.fn(),
  detail: vi.fn(),
  activate: vi.fn(),
  importDirectory: vi.fn(),
  close: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ mkdir: vi.fn() }));
vi.mock("../../src/platform/sqlite/catalog-runtime.worker.mjs?nodeWorker", () => ({
  default: vi.fn(),
}));
vi.mock("../../src/platform/sqlite/runtime-client", () => ({
  SqliteRuntimeClient: class {
    status = f.status;
    query = f.query;
    detail = f.detail;
    activate = f.activate;
    importDirectory = f.importDirectory;
    close = f.close;
  },
}));
vi.mock("electron", () => ({
  app: { getPath: () => "fixture", isPackaged: true },
  dialog: { showOpenDialog: f.dialog },
  ipcMain: {
    handle: (name: string, handler: (...args: unknown[]) => unknown) =>
      f.handlers.set(name, handler),
    removeHandler: (name: string) => f.handlers.delete(name),
  },
  BrowserWindow: class {
    webContents = { mainFrame: {}, setWindowOpenHandler: vi.fn(), on: vi.fn() };
    constructor() {
      f.windows.push(this);
    }
    isDestroyed = () => false;
    close = vi.fn();
    show = vi.fn();
    focus = vi.fn();
    removeMenu = vi.fn();
    loadFile = vi.fn();
    loadURL = vi.fn();
  },
}));
import { BrowserWindow } from "electron";
import { createCatalogHost } from "../../src/platform/electron/game-data/desktop";
import { catalogChannels } from "../../src/features/game-data/contracts";
beforeEach(() => {
  vi.clearAllMocks();
  f.handlers.clear();
  f.windows.length = 0;
  f.dialog.mockResolvedValue({ canceled: true, filePaths: [] });
  f.status.mockResolvedValue({ available: false, snapshots: [] });
});
async function fixture() {
  const main = new BrowserWindow();
  const host = createCatalogHost(main, { preload: "preload", renderer: "renderer" });
  await host.open();
  const target = f.windows[1] as BrowserWindow;
  const event = { sender: target.webContents, senderFrame: target.webContents.mainFrame };
  const invoke = (channel: keyof typeof catalogChannels, ...args: unknown[]) =>
    Promise.resolve().then(() => f.handlers.get(catalogChannels[channel])!(event, ...args));
  return { main, target, event, host, invoke };
}
it("rejects other windows/subframes for every catalog operation and restricts opening to main", async () => {
  const x = await fixture();
  for (const channel of ["status", "query", "detail", "activate", "import"] as const) {
    const handler = f.handlers.get(catalogChannels[channel])!;
    await expect(
      Promise.resolve().then(() =>
        handler({ sender: x.main.webContents, senderFrame: x.main.webContents.mainFrame }),
      ),
    ).rejects.toThrow("Unauthorized");
    await expect(
      Promise.resolve().then(() => handler({ ...x.event, senderFrame: {} })),
    ).rejects.toThrow("Unauthorized");
  }
  expect(() => f.handlers.get(catalogChannels.open)!(x.event)).toThrow("Unauthorized");
  expect(f.status).not.toHaveBeenCalled();
  await x.host.dispose();
});
it("validates query/detail/snapshot DTOs before touching storage", async () => {
  const x = await fixture();
  for (const value of [
    { kind: "base", limit: 101 },
    { kind: "mod", text: "x".repeat(201) },
    { kind: "base", sql: "SELECT" },
  ])
    await expect(x.invoke("query", value)).rejects.toThrow();
  await expect(x.invoke("detail", { kind: "stat", id: "test" })).rejects.toThrow();
  await expect(x.invoke("activate", "")).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  expect(f.detail).not.toHaveBeenCalled();
  await x.invoke("query", { kind: "base", text: "Paua" });
  expect(f.query).toHaveBeenCalledWith(
    expect.objectContaining({ limit: 30, offset: 0, text: "Paua" }),
  );
  await x.host.dispose();
  expect(f.close).toHaveBeenCalledOnce();
  expect(f.handlers.size).toBe(0);
});
it("keeps import paths main-owned, handles cancellation, and returns import status", async () => {
  const x = await fixture();
  await expect(x.invoke("import", "renderer-path")).rejects.toThrow("paths");
  expect(f.dialog).not.toHaveBeenCalled();
  expect(await x.invoke("import")).toEqual({ canceled: true });
  expect(f.importDirectory).not.toHaveBeenCalled();
  f.dialog.mockResolvedValue({ canceled: false, filePaths: ["chosen-by-main"] });
  expect(await x.invoke("import")).toMatchObject({
    canceled: false,
    status: { available: false },
    importMs: expect.any(Number),
  });
  expect(f.importDirectory).toHaveBeenCalledWith("chosen-by-main");
  await x.host.dispose();
});
