import { app, BrowserWindow } from "electron";
import { join } from "node:path";

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    title: "PoE Autocraft",
    width: 960,
    height: 640,
    backgroundColor: "#171411",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devServer) {
    await window.loadURL(devServer);
  } else {
    await window.loadFile(join(__dirname, "../renderer/index.html"));
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
