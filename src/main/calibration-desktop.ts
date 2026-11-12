import { BrowserWindow, ipcMain, screen, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { createCalibrationProfile } from "../domain/calibration-geometry";
import { pageIdSchema } from "../domain/calibration-layout";
import { desktopChannels, type DesktopState } from "../domain/desktop-api";
import { bundledLayout } from "../layouts";
import { z } from "zod";
import { applyOverlayMode, type OverlayMode } from "./overlay-mode";
import type { DisplaySnapshot } from "../domain/calibration-layout";

function snapshot(display: Electron.Display): DisplaySnapshot {
  return {
    id: display.id,
    bounds: { ...display.bounds },
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
  };
}

export function sameDisplay(left: DisplaySnapshot, right: DisplaySnapshot): boolean {
  return (
    left.id === right.id &&
    left.scaleFactor === right.scaleFactor &&
    left.rotation === right.rotation &&
    left.bounds.x === right.bounds.x &&
    left.bounds.y === right.bounds.y &&
    left.bounds.width === right.bounds.width &&
    left.bounds.height === right.bounds.height
  );
}

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
    mode: "hidden",
    displays: screen.getAllDisplays().map(snapshot),
    selectedDisplayId: display.id,
    requiresCalibration: false,
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
  const setMode = (mode: OverlayMode) => {
    if (overlay.isDestroyed()) throw new Error("Overlay is unavailable");
    applyOverlayMode(overlay, mode);
    state.mode = mode;
    state.visible = mode !== "hidden";
  };
  let previousProfile = structuredClone(state.profile);
  const cancel = () => {
    state.profile = structuredClone(previousProfile);
    setMode("hidden");
    publish();
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
    if (state.mode === "editing") throw new Error("Finish or cancel editing first");
    if (state.requiresCalibration)
      throw new Error("Display settings changed; recalibration is required");
    state.page = selectedPage;
    setMode("preview");
    publish();
  });
  ipcMain.handle(desktopChannels.hide, (event) => {
    requireSender(event);
    if (state.mode === "editing") {
      cancel();
      return;
    }
    setMode("hidden");
    publish();
  });
  ipcMain.handle(desktopChannels.edit, (event) => {
    requireSender(event);
    if (state.mode === "editing") return;
    const selected = state.displays.find((item) => item.id === state.selectedDisplayId);
    if (!selected) throw new Error("Select an available display first");
    previousProfile = structuredClone(state.profile);
    if (!sameDisplay(selected, state.profile.display)) {
      state.profile = createCalibrationProfile(bundledLayout, selected);
    }
    overlay.setBounds(selected.bounds);
    setMode("editing");
    publish();
  });
  ipcMain.handle(desktopChannels.cancel, (event) => {
    requireSender(event, true);
    if (state.mode === "editing") cancel();
  });
  ipcMain.handle(desktopChannels.display, (event, id: unknown) => {
    requireSender(event);
    const selectedId = z.int().parse(id);
    const selected = state.displays.find((item) => item.id === selectedId);
    if (!selected) throw new Error("Unknown display");
    if (state.mode === "editing") cancel();
    setMode("hidden");
    state.selectedDisplayId = selectedId;
    state.requiresCalibration = !sameDisplay(state.profile.display, selected);
    overlay.setBounds(selected.bounds);
    publish();
  });
  const refreshDisplays = () => {
    state.displays = screen.getAllDisplays().map(snapshot);
    const selected = state.displays.find((item) => item.id === state.selectedDisplayId);
    if (!selected || !sameDisplay(state.profile.display, selected)) {
      if (state.mode === "editing") state.profile = structuredClone(previousProfile);
      setMode("hidden");
      state.requiresCalibration = true;
      state.error = "Display settings changed. Select a display and recalibrate.";
    }
    publish();
  };
  screen.on("display-added", refreshDisplays);
  screen.on("display-removed", refreshDisplays);
  screen.on("display-metrics-changed", refreshDisplays);
  overlay.webContents.on("render-process-gone", () => {
    overlay.hide();
    state.visible = false;
    state.mode = "hidden";
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
        desktopChannels.edit,
        desktopChannels.cancel,
        desktopChannels.display,
      ]) {
        ipcMain.removeHandler(channel);
      }
      screen.removeListener("display-added", refreshDisplays);
      screen.removeListener("display-removed", refreshDisplays);
      screen.removeListener("display-metrics-changed", refreshDisplays);
      if (!overlay.isDestroyed()) overlay.destroy();
    },
  };
}
