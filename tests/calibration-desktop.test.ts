import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopChannels } from "../src/domain/desktop-api";

const electron = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  class WindowMock {
    constructor(public options: unknown = {}) {}
    destroyed = false;
    webContents = { mainFrame: {}, send: vi.fn(), on: vi.fn() };
    setMenu = vi.fn();
    setIgnoreMouseEvents = vi.fn();
    setFocusable = vi.fn();
    showInactive = vi.fn();
    hide = vi.fn();
    isDestroyed = () => this.destroyed;
    destroy = () => {
      this.destroyed = true;
    };
  }
  return {
    WindowMock,
    handlers,
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) =>
        handlers.set(channel, handler),
      ),
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
    },
    screen: {
      getPrimaryDisplay: () => ({
        id: 7,
        bounds: { x: -1280, y: 0, width: 1280, height: 720 },
        scaleFactor: 1.5,
        rotation: 0,
      }),
    },
  };
});
vi.mock("electron", () => ({
  BrowserWindow: electron.WindowMock,
  ipcMain: electron.ipcMain,
  screen: electron.screen,
}));

import { createCalibrationDesktop } from "../src/main/calibration-desktop";
import type { BrowserWindow } from "electron";

describe("native overlay boundary", () => {
  beforeEach(() => {
    electron.handlers.clear();
    vi.clearAllMocks();
  });
  const request = (main: InstanceType<typeof electron.WindowMock>) => ({
    sender: main.webContents,
    senderFrame: main.webContents.mainFrame,
  });

  it("creates an isolated transparent nonresizable overlay in desktop DIP", () => {
    const main = new electron.WindowMock();
    const desktop = createCalibrationDesktop(main as unknown as BrowserWindow);
    const overlay = desktop.overlay as unknown as InstanceType<typeof electron.WindowMock>;
    expect(overlay.options).toMatchObject({
      x: -1280,
      y: 0,
      width: 1280,
      height: 720,
      transparent: true,
      resizable: false,
      frame: false,
      show: false,
      focusable: false,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    expect(overlay.setIgnoreMouseEvents).toHaveBeenCalledWith(true);
  });

  it("shows without activation and publishes the selected page", () => {
    const main = new electron.WindowMock();
    const desktop = createCalibrationDesktop(main as unknown as BrowserWindow);
    const overlay = desktop.overlay as unknown as InstanceType<typeof electron.WindowMock>;
    electron.handlers.get(desktopChannels.preview)!(request(main), "atlas");
    expect(overlay.showInactive).toHaveBeenCalledOnce();
    expect(overlay.setFocusable).toHaveBeenLastCalledWith(false);
    expect(main.webContents.send).toHaveBeenLastCalledWith(
      desktopChannels.changed,
      expect.objectContaining({ page: "atlas", visible: true }),
    );
    electron.handlers.get(desktopChannels.hide)!(request(main));
    expect(overlay.hide).toHaveBeenCalledOnce();
  });

  it("rejects unknown pages and foreign windows/frames before changing visibility", () => {
    const main = new electron.WindowMock();
    const desktop = createCalibrationDesktop(main as unknown as BrowserWindow);
    const overlay = desktop.overlay as unknown as InstanceType<typeof electron.WindowMock>;
    const preview = electron.handlers.get(desktopChannels.preview)!;
    expect(() => preview(request(main), "unknown")).toThrow();
    expect(() => preview(request(new electron.WindowMock()), "atlas")).toThrow("Untrusted");
    expect(() => preview({ ...request(main), senderFrame: {} }, "atlas")).toThrow("Untrusted");
    expect(overlay.showInactive).not.toHaveBeenCalled();
  });

  it("disposes the overlay and all installed request handlers", () => {
    const desktop = createCalibrationDesktop(new electron.WindowMock() as unknown as BrowserWindow);
    desktop.dispose();
    expect(desktop.overlay.isDestroyed()).toBe(true);
    expect(electron.handlers.size).toBe(0);
  });
});
