import { BrowserWindow, ipcMain, screen, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { createCalibrationProfile } from "../domain/calibration-geometry";
import { pageIdSchema } from "../domain/calibration-layout";
import { desktopChannels, type DesktopState } from "../domain/desktop-api";
import { bundledLayout } from "../layouts";

export function desktopPreferences(): Electron.WebPreferences {
  return {
    preload: join(__dirname, "../preload/index.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
  };
}

export function createCalibrationDesktop(main: BrowserWindow): {
  overlay: BrowserWindow;
  dispose: () => void;
} {
  const display = screen.getPrimaryDisplay();
  const state: DesktopState = {
    profile: createCalibrationProfile(bundledLayout, {
      id: display.id,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor,
      rotation: display.rotation,
    }),
    page: "general",
    visible: false,
  };
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

  const publish = () => {
    for (const window of [main, overlay]) {
      if (!window.isDestroyed()) window.webContents.send(desktopChannels.changed, state);
    }
  };
  const requireSender = (event: IpcMainInvokeEvent, allowOverlay = false) => {
    const sender = [main, ...(allowOverlay ? [overlay] : [])].find(
      (window) => !window.isDestroyed() && window.webContents === event.sender,
    );
    if (!sender || event.senderFrame !== sender.webContents.mainFrame) {
      throw new Error("Untrusted calibration request");
    }
  };
  ipcMain.handle(desktopChannels.state, (event) => {
    requireSender(event, true);
    return state;
  });
  ipcMain.handle(desktopChannels.preview, (event, page: unknown) => {
    requireSender(event);
    const selectedPage = pageIdSchema.parse(page);
    if (overlay.isDestroyed()) throw new Error("Overlay is unavailable");
    state.page = selectedPage;
    overlay.setIgnoreMouseEvents(true);
    overlay.setFocusable(false);
    overlay.showInactive();
    state.visible = true;
    publish();
  });
  ipcMain.handle(desktopChannels.hide, (event) => {
    requireSender(event);
    if (!overlay.isDestroyed()) overlay.hide();
    state.visible = false;
    publish();
  });
  overlay.webContents.on("render-process-gone", () => {
    overlay.hide();
    state.visible = false;
    state.error = "Overlay renderer stopped. Restart the application to try again.";
    publish();
  });
  return {
    overlay,
    dispose() {
      for (const channel of [
        desktopChannels.state,
        desktopChannels.preview,
        desktopChannels.hide,
      ]) {
        ipcMain.removeHandler(channel);
      }
      if (!overlay.isDestroyed()) overlay.destroy();
    },
  };
}
