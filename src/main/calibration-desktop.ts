import { BrowserWindow, dialog, ipcMain, screen, type IpcMainInvokeEvent } from "electron";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { pageIdSchema, type DisplaySnapshot } from "../domain/calibration-layout";
import { displayKey, type CalibrationWorkspace } from "../domain/calibration-workspace";
import { desktopChannels, type DesktopResult } from "../domain/desktop-api";
import { applyOverlayMode } from "./overlay-mode";
import { CalibrationService, type CalibrationStorage } from "./calibration-service";

function snapshot(display: Electron.Display): DisplaySnapshot {
  return {
    id: display.id,
    bounds: { ...display.bounds },
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
  };
}

export function sameDisplay(left: DisplaySnapshot, right: DisplaySnapshot): boolean {
  return displayKey(left) === displayKey(right);
}

export function desktopPreferences(): Electron.WebPreferences {
  return {
    preload: join(__dirname, "../preload/index.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
  };
}

export function createCalibrationDesktop(
  main: BrowserWindow,
  options: {
    workspace: CalibrationWorkspace;
    storage: CalibrationStorage;
    loadError?: string;
  },
): { overlay: BrowserWindow; dispose: () => void } {
  const displays = screen.getAllDisplays().map(snapshot);
  const display =
    displays.find((item) => item.id === options.workspace.preferences.displayId) ?? displays[0];
  if (!display) throw new Error("No display is available for calibration");
  const overlay = new BrowserWindow({
    ...display.bounds,
    title: "PoE Autocraft Overlay",
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: desktopPreferences(),
  });
  overlay.setMenu(null);
  overlay.setIgnoreMouseEvents(true);
  const service = new CalibrationService(
    options.workspace,
    displays,
    options.storage,
    {
      setMode(mode) {
        if (overlay.isDestroyed()) throw new Error("Overlay is unavailable");
        applyOverlayMode(overlay, mode);
      },
      setBounds(selected) {
        overlay.setBounds(selected.bounds);
      },
      async chooseImport() {
        const result = await dialog.showOpenDialog(main, {
          properties: ["openFile"],
          filters: [{ name: "Calibration layout", extensions: ["json"] }],
        });
        if (result.canceled || !result.filePaths[0]) return undefined;
        const file = result.filePaths[0];
        if ((await stat(file)).size > 2 * 1024 * 1024)
          throw new Error("Layout file must not exceed 2 MB");
        return JSON.parse(await readFile(file, "utf8"));
      },
      async confirmReset() {
        const result = await dialog.showMessageBox(main, {
          type: "question",
          title: "Reset calibration",
          message: "Reset saved layouts and calibration?",
          detail:
            "A recovery copy of the existing file will be kept. This does not interact with the game.",
          buttons: ["Cancel", "Reset"],
          defaultId: 0,
          cancelId: 0,
        });
        return result.response === 1;
      },
    },
    options.loadError,
  );

  const publish = () => {
    const state = service.getState();
    for (const window of [main, overlay]) {
      if (!window.isDestroyed()) window.webContents.send(desktopChannels.changed, state);
    }
  };
  service.onChange = publish;
  const requireSender = (event: IpcMainInvokeEvent, allowOverlay = false) => {
    const sender = [main, ...(allowOverlay ? [overlay] : [])].find(
      (window) => !window.isDestroyed() && window.webContents === event.sender,
    );
    if (!sender || event.senderFrame !== sender.webContents.mainFrame)
      throw new Error("Untrusted calibration request");
  };
  const registered: string[] = [desktopChannels.state];
  ipcMain.handle(desktopChannels.state, (event) => {
    requireSender(event, true);
    return service.getState();
  });
  function bind<T>(
    channel: string,
    schema: z.ZodType<T>,
    action: (payload: T) => unknown,
    allowOverlay = false,
  ): void {
    registered.push(channel);
    ipcMain.handle(channel, async (event, input: unknown): Promise<DesktopResult> => {
      try {
        requireSender(event, allowOverlay);
        const payload = schema.parse(input);
        await action(payload);
        return { ok: true };
      } catch (error) {
        const invalid =
          error instanceof z.ZodError ||
          (error instanceof Error && error.message === "Untrusted calibration request");
        return {
          ok: false,
          error: {
            code: invalid ? "invalid-request" : "operation-failed",
            message:
              error instanceof z.ZodError
                ? "Invalid calibration request"
                : error instanceof Error
                  ? error.message
                  : "Calibration operation failed",
          },
        };
      }
    });
  }
  bind(desktopChannels.preview, pageIdSchema, (page) => service.preview(page));
  bind(desktopChannels.hide, z.undefined(), () => service.hide());
  bind(desktopChannels.edit, z.undefined(), () => service.edit());
  bind(desktopChannels.cancel, z.undefined(), () => service.cancel(), true);
  bind(desktopChannels.display, z.int(), (id) => service.selectDisplay(id));
  bind(desktopChannels.page, pageIdSchema, (page) => service.selectPage(page), true);
  bind(
    desktopChannels.visibility,
    z.strictObject({ inventory: z.boolean(), stash: z.boolean() }),
    (value) => service.setVisibility(value.inventory, value.stash),
    true,
  );
  bind(desktopChannels.update, z.unknown(), (value) => service.updateProfile(value), true);
  bind(desktopChannels.save, z.undefined(), () => service.save(), true);
  bind(desktopChannels.layout, z.string(), (key) => service.selectLayout(key));
  bind(desktopChannels.chooseImport, z.undefined(), () => service.chooseImport());
  bind(desktopChannels.confirmImport, z.undefined(), () => service.confirmImport());
  bind(desktopChannels.cancelImport, z.undefined(), () => service.cancelImport());
  bind(desktopChannels.reset, z.undefined(), () => service.reset());

  const refreshDisplays = () => service.refreshDisplays(screen.getAllDisplays().map(snapshot));
  screen.on("display-added", refreshDisplays);
  screen.on("display-removed", refreshDisplays);
  screen.on("display-metrics-changed", refreshDisplays);
  overlay.webContents.on("render-process-gone", () => service.rendererStopped());
  return {
    overlay,
    dispose() {
      for (const channel of registered) ipcMain.removeHandler(channel);
      screen.removeListener("display-added", refreshDisplays);
      screen.removeListener("display-removed", refreshDisplays);
      screen.removeListener("display-metrics-changed", refreshDisplays);
      if (!overlay.isDestroyed()) overlay.destroy();
    },
  };
}
