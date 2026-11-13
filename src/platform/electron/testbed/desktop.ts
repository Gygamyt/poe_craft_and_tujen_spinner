import { BrowserWindow, dialog, ipcMain, screen, type IpcMainInvokeEvent } from "electron";
import { writeFile } from "node:fs/promises";
import {
  TestbedSession,
  observedEventSchema,
  testbedCommandSchema,
} from "../../../features/testbed";
import { testbedChannels } from "../../../features/testbed/contracts";
import { createWin32Input } from "../../windows/input/win32";
import { createTargetDriver } from "./target-driver";
import { runNativeSuite } from "./native-suite";

export function createTestbedHost(
  main: BrowserWindow,
  paths: { preload: string; renderer: string },
) {
  let window: BrowserWindow | undefined;
  let session: TestbedSession | undefined;
  const requireMain = (event: IpcMainInvokeEvent) => {
    if (
      main.isDestroyed() ||
      event.sender !== main.webContents ||
      event.senderFrame !== main.webContents.mainFrame
    )
      throw new Error("Unauthorized testbed caller");
  };
  async function open() {
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
      return;
    }
    const native = createWin32Input();
    const target = new BrowserWindow({
      title: "PoE Autocraft — Input testbed",
      width: 1080,
      height: 800,
      minWidth: 980,
      minHeight: 720,
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
    let lastViewport = { width: 1066, height: 760 };
    let hook: ((data: unknown) => void) | undefined;
    let suiteRunning = false;
    const binding = createTargetDriver(target, native, (data) => {
      session?.record("delivered", data);
      hook?.(data);
    });
    const current = new TestbedSession({
      ...binding,
      viewport: () => {
        if (!target.isDestroyed()) lastViewport = binding.viewport();
        return lastViewport;
      },
      now: () => Date.now(),
      later(ms, callback) {
        const timer = setTimeout(callback, ms);
        return () => clearTimeout(timer);
      },
      publish(state) {
        if (!target.isDestroyed()) target.webContents.send(testbedChannels.changed, state);
      },
    });
    session = current;
    const authorized = (event: IpcMainInvokeEvent) => {
      if (
        target.isDestroyed() ||
        event.sender !== target.webContents ||
        event.senderFrame !== target.webContents.mainFrame
      )
        throw new Error("Unauthorized testbed caller");
    };
    target.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    target.webContents.on("will-navigate", (event) => event.preventDefault());
    target.on("blur", () => current.stop("focus-lost"));
    target.on("resize", () => {
      current.stop("geometry-changed");
      current.publish();
    });
    target.on("move", () => current.stop("geometry-changed"));
    const changedDisplay = () => current.stop("display-changed");
    screen.on("display-metrics-changed", changedDisplay);
    screen.on("display-removed", changedDisplay);
    ipcMain.handle(testbedChannels.state, (event) => {
      authorized(event);
      return current.snapshot();
    });
    ipcMain.handle(testbedChannels.command, async (event, payload: unknown) => {
      authorized(event);
      const command = testbedCommandSchema.parse(payload);
      if (suiteRunning && !["stop", "export"].includes(command.kind))
        throw new Error("native-suite-busy");
      switch (command.kind) {
        case "placement":
          current.configure(command);
          break;
        case "run":
          await current.run(command);
          break;
        case "stop":
          current.stop();
          break;
        case "page":
          current.page(command.page);
          break;
        case "reset":
          current.reset(command.seed);
          break;
        case "fault":
          current.setFault(command.fault);
          break;
        case "toggle":
          current.toggle(command.targetId, command.enabled);
          break;
        case "export": {
          const result = await dialog.showSaveDialog(target, {
            title: "Export input trace",
            defaultPath: "input-trace.json",
            filters: [{ name: "JSON", extensions: ["json"] }],
          });
          if (!result.canceled && result.filePath)
            await writeFile(result.filePath, JSON.stringify(current.snapshot(), null, 2), "utf8");
          break;
        }
        case "suite":
          suiteRunning = true;
          try {
            await runNativeSuite(current, target, main, native, (value) => {
              hook = value;
            });
          } finally {
            suiteRunning = false;
          }
          break;
      }
    });
    const received = (event: Electron.IpcMainEvent, payload: unknown) => {
      if (
        target.isDestroyed() ||
        event.sender !== target.webContents ||
        event.senderFrame !== target.webContents.mainFrame
      )
        return;
      const parsed = observedEventSchema.safeParse(payload);
      if (parsed.success) current.receive(parsed.data);
    };
    ipcMain.on(testbedChannels.observed, received);
    target.on("closed", () => {
      current.dispose();
      ipcMain.removeHandler(testbedChannels.state);
      ipcMain.removeHandler(testbedChannels.command);
      ipcMain.removeListener(testbedChannels.observed, received);
      screen.removeListener("display-metrics-changed", changedDisplay);
      screen.removeListener("display-removed", changedDisplay);
      if (window === target) {
        window = undefined;
        session = undefined;
      }
    });
    const server = process.env.ELECTRON_RENDERER_URL;
    if (server) {
      const url = new URL(server);
      url.searchParams.set("view", "testbed");
      await target.loadURL(url.href);
    } else await target.loadFile(paths.renderer, { query: { view: "testbed" } });
    target.show();
    target.focus();
  }
  ipcMain.handle(testbedChannels.open, async (event) => {
    requireMain(event);
    await open();
  });
  return {
    open,
    dispose() {
      session?.dispose();
      if (window && !window.isDestroyed()) window.close();
      ipcMain.removeHandler(testbedChannels.open);
    },
  };
}
