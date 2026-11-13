import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import {
  createCalibrationDesktop,
  desktopPreferences,
} from "../platform/electron/calibration/desktop";
import { WorkspaceStore } from "../platform/electron/calibration/workspace-store";
import { createWorkspace, displaySnapshotSchema, bundledLayout } from "../features/calibration";
import { createTestbedHost } from "../platform/electron/testbed/desktop";

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

  const initial = createWorkspace(bundledLayout, displaySnapshotSchema.parse(display));
  const storage = new WorkspaceStore(
    join(app.getPath("userData"), "calibration-workspace.json"),
    initial,
  );
  let workspace = initial;
  let loadError: string | undefined;
  try {
    workspace = await storage.load();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Cannot load calibration data";
  }
  const desktop = createCalibrationDesktop(window, { workspace, storage, loadError });
  const testbed = createTestbedHost(window, {
    preload: join(__dirname, "../preload/index.js"),
    renderer: join(__dirname, "../renderer/index.html"),
  });
  window.on("closed", () => {
    desktop.dispose();
    testbed.dispose();
  });
  await loadView(desktop.overlay, "overlay");
  await loadView(desktop.previewControls, "preview-controls");
  await loadView(window, "main");
  window.show();
  window.focus();
  if (process.argv.includes("--input-testbed-harness")) await testbed.open();
  if (process.env.ELECTRON_RENDERER_URL) {
    console.info("Control window ready", {
      visible: window.isVisible(),
      bounds: window.getBounds(),
    });
  }
}

async function loadView(
  window: BrowserWindow,
  view: "main" | "overlay" | "preview-controls",
): Promise<void> {
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
  if (process.argv.includes("--catalog-runtime-probe")) {
    void import("../platform/electron/game-data/runtime-probe")
      .then(({ runCatalogRuntimeProbe }) => runCatalogRuntimeProbe())
      .then(() => app.quit())
      .catch((error: unknown) => {
        console.error("CATALOG_RUNTIME_PROBE failed", error);
        app.exit(1);
      });
    return;
  }
  if (process.argv.includes("--input-probe")) {
    void import("../platform/electron/testbed/probe")
      .then(({ runInputProbe }) =>
        runInputProbe({
          preload: join(__dirname, "../preload/index.js"),
          renderer: join(__dirname, "../renderer/index.html"),
        }),
      )
      .catch((error: unknown) => {
        console.error("INPUT_PROBE failed", error);
        app.exit(1);
      });
    return;
  }
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
