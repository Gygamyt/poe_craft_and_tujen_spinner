import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopChannels } from "../src/domain/desktop-api";
import { createWorkspace, saveProfile } from "../src/domain/calibration-workspace";
import { createCalibrationProfile } from "../src/domain/calibration-geometry";
import { templateFixture } from "./fixtures/calibration";

const electron = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const display = {
    id: 7,
    bounds: { x: -1280, y: 0, width: 1280, height: 720 },
    scaleFactor: 1.5,
    rotation: 0,
  };
  class WindowMock {
    constructor(public options: unknown = {}) {}
    destroyed = false;
    webContents = { mainFrame: {}, send: vi.fn(), on: vi.fn() };
    setMenu = vi.fn();
    setIgnoreMouseEvents = vi.fn();
    setFocusable = vi.fn();
    showInactive = vi.fn();
    moveTop = vi.fn();
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
    display,
    handlers,
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) =>
        handlers.set(channel, handler),
      ),
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
    },
    screen: {
      getAllDisplays: vi.fn(() => [structuredClone(display)]),
      on: vi.fn<(event: string, listener: () => void) => void>(),
      removeListener: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] as string[] })),
      showMessageBox: vi.fn(async () => ({ response: 0 })),
    },
  };
});
vi.mock("electron", () => ({
  BrowserWindow: electron.WindowMock,
  ipcMain: electron.ipcMain,
  screen: electron.screen,
  dialog: electron.dialog,
}));

import { createCalibrationDesktop } from "../src/main/calibration-desktop";
import type { BrowserWindow } from "electron";

describe("native overlay boundary", () => {
  beforeEach(() => {
    electron.handlers.clear();
    vi.clearAllMocks();
    electron.screen.getAllDisplays.mockReturnValue([structuredClone(electron.display)]);
  });
  function fixture() {
    const main = new electron.WindowMock();
    const template = templateFixture();
    const workspace = saveProfile(
      createWorkspace(template, electron.display),
      createCalibrationProfile(template, electron.display),
      template,
    );
    const storage = { save: vi.fn(async () => undefined), reset: vi.fn(async () => workspace) };
    const desktop = createCalibrationDesktop(main as unknown as BrowserWindow, {
      workspace,
      storage,
    });
    const event = { sender: main.webContents, senderFrame: main.webContents.mainFrame };
    const call = (channel: string, input?: unknown, sender = event) =>
      electron.handlers.get(channel)!(sender, input);
    return {
      main,
      desktop,
      storage,
      event,
      call,
      overlay: desktop.overlay as unknown as InstanceType<typeof electron.WindowMock>,
      controls: desktop.previewControls as unknown as InstanceType<typeof electron.WindowMock>,
    };
  }

  it("creates an isolated transparent nonresizable overlay using desktop DIP", () => {
    const { overlay } = fixture();
    expect(overlay.options).toMatchObject({
      x: -1280,
      y: 0,
      width: 1280,
      height: 720,
      transparent: true,
      resizable: false,
      frame: false,
      focusable: false,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
  });

  it("passes preview input through and supports cancel after focused editing", async () => {
    const { overlay, call } = fixture();
    expect(await call(desktopChannels.preview, "atlas")).toEqual({ ok: true });
    expect(overlay.showInactive).toHaveBeenCalledOnce();
    expect(overlay.setFocusable).toHaveBeenLastCalledWith(false);
    await call(desktopChannels.edit);
    expect(overlay.focus).toHaveBeenCalledOnce();
    expect(overlay.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
    await call(desktopChannels.cancel);
    expect(call(desktopChannels.state)).toMatchObject({ mode: "hidden", visible: false });
  });

  it("rejects foreign senders, child frames and malformed requests with typed errors", async () => {
    const { overlay, call, event } = fixture();
    for (const result of [
      await call(desktopChannels.preview, "unknown"),
      await call(desktopChannels.preview, "atlas", { ...event, senderFrame: {} }),
      await call(desktopChannels.preview, "atlas", {
        sender: new electron.WindowMock().webContents,
        senderFrame: {},
      }),
    ]) {
      expect(result).toMatchObject({ ok: false, error: { code: "invalid-request" } });
    }
    expect(overlay.showInactive).not.toHaveBeenCalled();
    expect(electron.handlers.has("calibration:arbitrary-file-read")).toBe(false);
    expect(await call(desktopChannels.update, { invalid: true })).toMatchObject({ ok: false });
  });

  it.each(["scale", "position", "rotation", "removed"])(
    "hides calibration after display %s changes",
    async (change) => {
      const { call } = fixture();
      await call(desktopChannels.preview, "general");
      const displays = [structuredClone(electron.display)];
      if (change === "scale") displays[0].scaleFactor = 2;
      if (change === "position") displays[0].bounds.x -= 1;
      if (change === "rotation") displays[0].rotation = 90;
      electron.screen.getAllDisplays.mockReturnValue(change === "removed" ? [] : displays);
      electron.screen.on.mock.calls.find(([event]) => event === "display-metrics-changed")![1]();
      expect(call(desktopChannels.state)).toMatchObject({
        mode: "hidden",
        requiresCalibration: true,
      });
    },
  );

  it("cancels native dialogs without writing and reports file-read failures", async () => {
    const { call, storage } = fixture();
    expect(await call(desktopChannels.chooseImport)).toEqual({ ok: true });
    await call(desktopChannels.reset);
    expect(storage.save).not.toHaveBeenCalled();
    expect(storage.reset).not.toHaveBeenCalled();
    electron.dialog.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: ["tmp/nonexistent-layout-for-test.json"],
    });
    expect(await call(desktopChannels.chooseImport)).toMatchObject({
      ok: false,
      error: { code: "operation-failed" },
    });
  });

  it("disposes the native window, handlers and display listeners", () => {
    const { desktop } = fixture();
    desktop.dispose();
    expect(desktop.overlay.isDestroyed()).toBe(true);
    expect(desktop.previewControls.isDestroyed()).toBe(true);
    expect(electron.handlers.size).toBe(0);
    expect(electron.screen.removeListener).toHaveBeenCalledTimes(3);
  });

  it("shows a compact nonactivating panel only during preview", async () => {
    const { overlay, controls, call } = fixture();
    expect(controls.options).toMatchObject({
      width: 280,
      height: 68,
      focusable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    await call(desktopChannels.preview, "general");
    expect(controls.showInactive).toHaveBeenCalledOnce();
    expect(controls.moveTop).toHaveBeenCalledOnce();
    expect(controls.showInactive.mock.invocationCallOrder[0]).toBeGreaterThan(
      overlay.showInactive.mock.invocationCallOrder[0],
    );
    await call(desktopChannels.edit);
    expect(controls.hide).toHaveBeenCalled();
    expect(controls.focus).not.toHaveBeenCalled();
  });

  it("allows the preview panel to hide and return to main, but rejects editing and file operations", async () => {
    const { main, controls, overlay, call } = fixture();
    const sender = { sender: controls.webContents, senderFrame: controls.webContents.mainFrame };
    expect(call(desktopChannels.state, undefined, sender)).toMatchObject({ mode: "hidden" });
    for (const channel of [
      desktopChannels.edit,
      desktopChannels.update,
      desktopChannels.save,
      desktopChannels.chooseImport,
      desktopChannels.reset,
      desktopChannels.page,
    ]) {
      expect(await call(channel, undefined, sender)).toMatchObject({
        ok: false,
        error: { code: "invalid-request" },
      });
    }
    await call(desktopChannels.preview, "general");
    const before = call(desktopChannels.state) as { profile: unknown };
    expect(await call(desktopChannels.hide, undefined, sender)).toEqual({ ok: true });
    expect(call(desktopChannels.state)).toMatchObject({ mode: "hidden", profile: before.profile });
    expect(overlay.hide).toHaveBeenCalled();
    expect(controls.hide).toHaveBeenCalled();
    expect(main.show).toHaveBeenCalledOnce();
    expect(main.focus).toHaveBeenCalledOnce();
  });

  it("hides preview controls on display incompatibility or panel renderer failure", async () => {
    const { main, controls, call } = fixture();
    await call(desktopChannels.preview, "general");
    electron.screen.getAllDisplays.mockReturnValue([]);
    electron.screen.on.mock.calls.find(([event]) => event === "display-removed")![1]();
    expect(controls.hide).toHaveBeenCalled();
    controls.webContents.on.mock.calls.find(([event]) => event === "render-process-gone")![1]();
    expect(call(desktopChannels.state)).toMatchObject({ mode: "hidden" });
    expect(main.focus).toHaveBeenCalled();
  });
});
