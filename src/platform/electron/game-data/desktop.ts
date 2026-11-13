import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogQuerySchema } from "../../../features/game-data";
import { catalogChannels } from "../../../features/game-data/contracts";
import { SqliteRuntimeClient } from "../../sqlite/runtime-client";
import CatalogWorker from "../../sqlite/catalog-runtime.worker.mjs?nodeWorker";

const identifier = z.string().min(1).max(500);
const detailSchema = z.strictObject({
  kind: z.enum(["base", "mod"]),
  id: identifier,
  snapshotId: identifier.optional(),
});

export function createCatalogHost(
  main: BrowserWindow,
  paths: { preload: string; renderer: string },
) {
  let window: BrowserWindow | undefined;
  let client: Promise<SqliteRuntimeClient> | undefined;
  let disposed = false;
  const repository = () =>
    (client ??= (async () => {
      const root = app.getPath("userData");
      await mkdir(root, { recursive: true });
      const runtime = new SqliteRuntimeClient(
        CatalogWorker({ workerData: { file: join(root, "game-data.sqlite") } }),
        30_000,
      );
      return runtime;
    })());
  function authorize(event: IpcMainInvokeEvent, target = window) {
    if (
      disposed ||
      !target ||
      target.isDestroyed() ||
      event.sender !== target.webContents ||
      event.senderFrame !== target.webContents.mainFrame
    )
      throw new Error("Unauthorized catalog caller");
  }
  async function open() {
    if (disposed) throw new Error("Catalog host closed");
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
      return;
    }
    const target = new BrowserWindow({
      title: "PoE Autocraft — Catalog",
      width: 1100,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: "#171411",
      webPreferences: {
        preload: paths.preload,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    window = target;
    target.removeMenu();
    target.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    target.webContents.on("will-navigate", (event) => event.preventDefault());
    const dev = process.env.ELECTRON_RENDERER_URL;
    if (!app.isPackaged && dev) {
      const url = new URL(dev);
      url.searchParams.set("view", "catalog");
      await target.loadURL(url.href);
    } else await target.loadFile(paths.renderer, { query: { view: "catalog" } });
  }
  ipcMain.handle(catalogChannels.open, (event) => {
    authorize(event, main);
    return open();
  });
  ipcMain.handle(catalogChannels.status, async (event) => {
    authorize(event);
    return (await repository()).status();
  });
  ipcMain.handle(catalogChannels.query, async (event, value: unknown) => {
    authorize(event);
    const query = catalogQuerySchema.parse(value);
    return (await repository()).query(query);
  });
  ipcMain.handle(catalogChannels.detail, async (event, value: unknown) => {
    authorize(event);
    const query = detailSchema.parse(value);
    return (await repository()).detail(query.kind, query.id, query.snapshotId);
  });
  ipcMain.handle(catalogChannels.activate, async (event, value: unknown) => {
    authorize(event);
    const id = identifier.parse(value);
    return (await repository()).activate(id);
  });
  ipcMain.handle(catalogChannels.import, async (event, ...args: unknown[]) => {
    authorize(event);
    if (args.length) throw new Error("Import does not accept renderer paths");
    const result = await dialog.showOpenDialog(window!, {
      title: "Select validated catalog bundle folder",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    authorize(event);
    const started = Date.now();
    const runtime = await repository();
    await runtime.importDirectory(result.filePaths[0]);
    const status = await runtime.status();
    const importMs = Date.now() - started;
    console.info("CATALOG_IMPORT", { snapshotId: status.activeSnapshotId, importMs });
    return { canceled: false, status, importMs };
  });
  return {
    open,
    async dispose() {
      disposed = true;
      if (window && !window.isDestroyed()) window.close();
      for (const channel of Object.values(catalogChannels)) ipcMain.removeHandler(channel);
      if (client) await (await client).close();
    },
  };
}
