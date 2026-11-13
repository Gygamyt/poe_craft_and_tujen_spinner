import { app, BrowserWindow, ipcMain } from "electron";
import { setTimeout as delay } from "node:timers/promises";
import { createWin32Input } from "../../windows/input/win32";
import { probeChannels, type ProbeEvent } from "../../../features/testbed/contracts";

/** Opt-in ABI gate. Never registers or writes a calibration workspace. */
export async function runInputProbe(paths: { preload: string; renderer: string }) {
  const native = createWin32Input();
  const window = new BrowserWindow({
    title: "PoE Autocraft — native input probe",
    width: 640,
    height: 420,
    webPreferences: {
      preload: paths.preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  window.removeMenu();
  const handle = window.getNativeWindowHandle().readBigUInt64LE();
  const received: ProbeEvent[] = [];
  let done = false;
  let pressed = false;
  let armed = false;
  let started = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let expected = { x: 0, y: 0 };
  const finish = (error?: unknown) => {
    if (done) return;
    done = true;
    clearTimeout(timeout);
    if (pressed) native.mouse(4);
    console.info(
      "INPUT_PROBE",
      JSON.stringify({
        ok: !error,
        mode: process.env.ELECTRON_RENDERER_URL ? "dev" : "build",
        electron: process.versions.electron,
        node: process.versions.node,
        arch: process.arch,
        koffi: native.version,
        layout: native.layout,
        expected,
        received,
        error: error instanceof Error ? error.message : error,
      }),
    );
    if (!window.isDestroyed()) {
      window.webContents.send(probeChannels.result, {
        ok: !error,
        error: error instanceof Error ? error.message : error ? String(error) : undefined,
      });
    }
    setTimeout(() => app.exit(error ? 1 : 0), 1500);
  };
  window.on("closed", () => finish(new Error("Probe target closed")));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  ipcMain.on(probeChannels.received, (event, value: ProbeEvent) => {
    if (done || !armed || window.isDestroyed() || event.sender !== window.webContents) return;
    if (!value || !["pointerdown", "pointerup", "click"].includes(value.type)) return;
    received.push(value);
    if (value.type === "click") {
      const valid =
        received.map((item) => item.type).join(",") === "pointerdown,pointerup,click" &&
        received.every(
          (item) =>
            item.trusted &&
            item.button === 0 &&
            Math.abs(item.x - expected.x) <= 2 &&
            Math.abs(item.y - expected.y) <= 2,
        );
      clearTimeout(timeout);
      finish(valid ? undefined : new Error("Received events do not match native click"));
    }
  });
  ipcMain.handle(probeChannels.ready, async (event) => {
    if (done || window.isDestroyed() || event.sender !== window.webContents || started)
      throw new Error("Unauthorized probe request");
    started = true;
    timeout = setTimeout(() => finish(new Error("Probe deadline exceeded")), 12000);
    try {
      window.show();
      window.focus();
      await delay(250);
      const geometry = native.client(handle);
      const desktop = native.desktop();
      const oldCursor = native.cursor();
      if (!Number.isFinite(oldCursor.x) || !Number.isFinite(oldCursor.y))
        throw new Error("Invalid cursor lookup");
      if (native.held(1) || native.held(2) || native.held(0x10))
        throw new Error("Release physical input before probing");
      const [width, height] = window.getContentSize();
      expected = { x: width / 2, y: height / 2 };
      const x = geometry.x + geometry.width / 2;
      const y = geometry.y + geometry.height / 2;
      const token = JSON.stringify(geometry);
      const emit = (flags: number, dx = 0, dy = 0) => {
        if (done || native.foreground() !== handle)
          throw new Error("Probe window is not foreground");
        if (JSON.stringify(native.client(handle)) !== token)
          throw new Error("Probe geometry changed");
        if (native.mouse(flags, dx, dy) !== 1) throw new Error("Partial SendInput delivery");
      };
      armed = true;
      emit(
        0xc001,
        Math.round(((x - desktop.x) * 65535) / (desktop.width - 1)),
        Math.round(((y - desktop.y) * 65535) / (desktop.height - 1)),
      );
      emit(2);
      pressed = true;
      emit(4);
      pressed = false;
    } catch (error) {
      finish(error);
    }
  });
  const server = process.env.ELECTRON_RENDERER_URL;
  if (server) {
    const url = new URL(server);
    url.searchParams.set("view", "input-probe");
    await window.loadURL(url.href);
  } else {
    await window.loadFile(paths.renderer, {
      query: { view: "input-probe" },
    });
  }
}
