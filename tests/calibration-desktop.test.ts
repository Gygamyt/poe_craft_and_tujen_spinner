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
    show = vi.fn();
    focus = vi.fn();
    blur = vi.fn();
    setBounds = vi.fn();
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
      getAllDisplays: vi.fn(() => [
        {
          id: 7,
          bounds: { x: -1280, y: 0, width: 1280, height: 720 },
          scaleFactor: 1.5,
          rotation: 0,
        },
      ]),
      on: vi.fn<(event: string, listener: () => void) => void>(),
      removeListener: vi.fn(),
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
    electron.screen.getAllDisplays.mockReturnValue([electron.screen.getPrimaryDisplay()]);
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
    expect(electron.screen.removeListener).toHaveBeenCalledTimes(3);
  });

  it("enters editing with focus and cancels back to hidden without losing data", () => {
    const main = new electron.WindowMock();
    const desktop = createCalibrationDesktop(main as unknown as BrowserWindow);
    const overlay = desktop.overlay as unknown as InstanceType<typeof electron.WindowMock>;
    const state = electron.handlers.get(desktopChannels.state)!;
    const before = structuredClone(state(request(main)));
    electron.handlers.get(desktopChannels.edit)!(request(main));
    expect(overlay.show).toHaveBeenCalledOnce();
    expect(overlay.focus).toHaveBeenCalledOnce();
    expect(overlay.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
    expect(() => electron.handlers.get(desktopChannels.preview)!(request(main), "general")).toThrow(
      "Finish or cancel",
    );
    electron.handlers.get(desktopChannels.cancel)!(request(main));
    expect(state(request(main))).toEqual(before);
    expect(overlay.setFocusable).toHaveBeenLastCalledWith(false);
    expect(overlay.hide).toHaveBeenCalledOnce();
  });

  it.each(["scale", "position", "rotation", "removed"])(
    "hides incompatible calibration after display %s changes",
    (change) => {
      const main = new electron.WindowMock();
      createCalibrationDesktop(main as unknown as BrowserWindow);
      electron.handlers.get(desktopChannels.preview)!(request(main), "general");
      const displays = [electron.screen.getPrimaryDisplay()];
      if (change === "scale") displays[0].scaleFactor = 2;
      if (change === "position") displays[0].bounds.x -= 1;
      if (change === "rotation") displays[0].rotation = 90;
      electron.screen.getAllDisplays.mockReturnValue(change === "removed" ? [] : displays);
      const refresh = electron.screen.on.mock.calls.find(
        ([event]) => event === "display-metrics-changed",
      )![1];
      refresh();
      expect(electron.handlers.get(desktopChannels.state)!(request(main))).toMatchObject({
        mode: "hidden",
        visible: false,
        requiresCalibration: true,
      });
      expect(() =>
        electron.handlers.get(desktopChannels.preview)!(request(main), "general"),
      ).toThrow("recalibration");
    },
  );
});
