import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { createCalibrationDesktop, desktopPreferences } from "./calibration-desktop";

async function createWindow(): Promise<void> {
  const display = screen.getPrimaryDisplay();
  const width = Math.min(960, display.workArea.width);
  const height = Math.min(640, display.workArea.height);
  const window = new BrowserWindow({
    title: "PoE Autocraft",
    show: false,
    width,
    height,
    x: display.workArea.x + Math.floor((display.workArea.width - width) / 2),
    y: display.workArea.y + Math.floor((display.workArea.height - height) / 2),
    backgroundColor: "#171411",
    webPreferences: desktopPreferences(),
  });

  const desktop = createCalibrationDesktop(window);
  window.on("closed", () => desktop.dispose());
  await loadView(desktop.overlay, "overlay");
  await loadView(window, "main");
  window.show();
  window.focus();
  if (process.env.ELECTRON_RENDERER_URL) {
    console.info("Control window ready", {
      visible: window.isVisible(),
      bounds: window.getBounds(),
    });
  }
}

async function loadView(window: BrowserWindow, view: "main" | "overlay"): Promise<void> {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("preload-error", (_event, _path, error) => {
    console.error(`[${view}] preload error`, error);
  });
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`[${view}] load failed`, code, description);
  });
  window.webContents.on("console-message", (details) => {
    if (details.level === "error") console.error(`[${view}] renderer`, details.message);
  });
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devServer) {
    const url = new URL(devServer);
    url.searchParams.set("view", view);
    await window.loadURL(url.href);
  } else {
    await window.loadFile(join(__dirname, "../renderer/index.html"), { query: { view } });
  }
}

function openWindow(): void {
  void createWindow().catch((error: unknown) => {
    console.error("Failed to load PoE Autocraft", error);
    app.exit(1);
  });
}

void app.whenReady().then(() => {
  openWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
