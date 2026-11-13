import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  listeners: new Map<string, (...args: unknown[]) => unknown>(),
  windows: [] as unknown[],
  write: vi.fn(),
  save: vi.fn(async () => ({ canceled: true, filePath: undefined as string | undefined })),
}));
vi.mock("node:fs/promises", () => ({ writeFile: f.write }));
vi.mock("electron", () => ({
  dialog: { showSaveDialog: f.save },
  screen: { on: vi.fn(), removeListener: vi.fn() },
  ipcMain: {
    handle: (name: string, handler: (...args: unknown[]) => unknown) =>
      f.handlers.set(name, handler),
    on: (name: string, handler: (...args: unknown[]) => unknown) => f.listeners.set(name, handler),
    removeHandler: (name: string) => f.handlers.delete(name),
    removeListener: (name: string) => f.listeners.delete(name),
  },
  BrowserWindow: class {
    webContents = { mainFrame: {}, send: vi.fn(), setWindowOpenHandler: vi.fn(), on: vi.fn() };
    constructor() {
      f.windows.push(this);
    }
    private events = new Map<string, () => void>();
    on(name: string, callback: () => void) {
      this.events.set(name, callback);
    }
    close() {
      this.events.get("closed")?.();
    }
    isDestroyed = () => false;
    show = vi.fn();
    focus = vi.fn();
    removeMenu = vi.fn();
    loadFile = vi.fn();
    loadURL = vi.fn();
  },
}));
vi.mock("../../src/platform/windows/input/win32", () => ({ createWin32Input: () => ({}) }));
vi.mock("../../src/platform/electron/testbed/native-suite", () => ({ runNativeSuite: vi.fn() }));
vi.mock("../../src/platform/electron/testbed/target-driver", () => ({
  createTargetDriver: () => ({
    viewport: () => ({ width: 1080, height: 760 }),
    capture: () => ({ token: "fixture", cursor: { x: 30, y: 30 } }),
    driver: {
      assertTarget: () => {},
      held: () => true,
      now: () => 0,
      move: () => 1,
      button: () => 1,
      shift: () => 1,
      sleep: async () => {},
    },
  }),
}));
import { BrowserWindow } from "electron";
import { createTestbedHost } from "../../src/platform/electron/testbed/desktop";
import { testbedChannels } from "../../src/features/testbed/contracts";
beforeEach(() => {
  f.handlers.clear();
  f.listeners.clear();
  f.windows.length = 0;
  vi.clearAllMocks();
  f.save.mockResolvedValue({ canceled: true, filePath: undefined });
});
async function fixture() {
  const main = new BrowserWindow();
  const host = createTestbedHost(main, { preload: "fixture", renderer: "fixture" });
  await host.open();
  const target = f.windows[1] as BrowserWindow;
  const event = { sender: target.webContents, senderFrame: target.webContents.mainFrame };
  return { main, target, host, event, command: f.handlers.get(testbedChannels.command)! };
}
it("authorizes only the registered target main frame, without renderer HWND/path/coordinate escape hatches", async () => {
  const x = await fixture();
  await expect(
    x.command(
      { sender: x.main.webContents, senderFrame: x.main.webContents.mainFrame },
      { kind: "stop" },
    ),
  ).rejects.toThrow("Unauthorized");
  await expect(x.command({ ...x.event, senderFrame: {} }, { kind: "stop" })).rejects.toThrow(
    "Unauthorized",
  );
  await expect(
    x.command(x.event, {
      kind: "run",
      targetId: "inventory-0",
      button: "primary",
      shift: false,
      seed: 1,
      hwnd: 1,
    }),
  ).rejects.toThrow();
  const state = f.handlers.get(testbedChannels.state)!(x.event) as { targets: unknown[] };
  expect(state.targets).toHaveLength(120);
  x.host.dispose();
});
it("cancels an export without writing and writes only the main-owned chosen path", async () => {
  const x = await fixture();
  await x.command(x.event, { kind: "export" });
  expect(f.write).not.toHaveBeenCalled();
  f.save.mockResolvedValueOnce({ canceled: false, filePath: "selected-by-main.json" });
  await x.command(x.event, { kind: "export" });
  expect(f.write).toHaveBeenCalledWith("selected-by-main.json", expect.any(String), "utf8");
  x.host.dispose();
});
it("does not write calibration during open/reset/page changes and disposes target handlers", async () => {
  const x = await fixture();
  await x.command(x.event, { kind: "reset", seed: 2 });
  await x.command(x.event, { kind: "page", page: "atlas" });
  expect(f.write).not.toHaveBeenCalled();
  x.host.dispose();
  expect(f.handlers.has(testbedChannels.command)).toBe(false);
  expect(f.listeners.has(testbedChannels.observed)).toBe(false);
});
