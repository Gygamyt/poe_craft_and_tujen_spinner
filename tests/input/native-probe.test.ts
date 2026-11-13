import { beforeEach, afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => {
  const sender = {};
  return {
    sender,
    handle: vi.fn(),
    on: vi.fn(),
    exit: vi.fn(),
    foreground: vi.fn(() => 1n),
    held: vi.fn(() => false),
    mouse: vi.fn<(flags: number, x?: number, y?: number) => number>(() => 1),
    client: vi.fn(() => ({ x: 100, y: 100, width: 640, height: 400 })),
  };
});
vi.mock("node:timers/promises", () => ({ setTimeout: async () => undefined }));
vi.mock("electron", () => ({
  app: { exit: fixture.exit },
  ipcMain: { handle: fixture.handle, on: fixture.on },
  BrowserWindow: class {
    webContents = { ...fixture.sender, setWindowOpenHandler: vi.fn(), on: vi.fn(), send: vi.fn() };
    constructor() {
      fixture.sender = this.webContents;
    }
    getNativeWindowHandle() {
      const buffer = Buffer.alloc(8);
      buffer.writeBigUInt64LE(1n);
      return buffer;
    }
    getContentSize() {
      return [640, 400];
    }
    on = vi.fn();
    removeMenu = vi.fn();
    isDestroyed = () => false;
    show = vi.fn();
    focus = vi.fn();
    loadFile = vi.fn();
    loadURL = vi.fn();
  },
}));
vi.mock("../../src/platform/windows/input/win32", () => ({
  createWin32Input: () => ({
    layout: { size: 40, dataOffset: 8 },
    version: "fixture",
    foreground: fixture.foreground,
    held: fixture.held,
    mouse: fixture.mouse,
    client: fixture.client,
    cursor: () => ({ x: 100, y: 100 }),
    desktop: () => ({ x: 0, y: 0, width: 1920, height: 1080 }),
  }),
}));
import { runInputProbe } from "../../src/platform/electron/testbed/probe";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  fixture.foreground.mockReturnValue(1n);
  fixture.held.mockReturnValue(false);
  fixture.mouse.mockReturnValue(1);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function open() {
  await runInputProbe({ preload: "fixture-preload", renderer: "fixture-renderer" });
  return fixture.handle.mock.calls[0][1] as (event: { sender: unknown }) => Promise<void>;
}

it("does not emit input before explicit arm and rejects another renderer", async () => {
  const ready = await open();
  expect(fixture.mouse).not.toHaveBeenCalled();
  await expect(ready({ sender: {} })).rejects.toThrow("Unauthorized");
  expect(fixture.mouse).not.toHaveBeenCalled();
});

it.each(["foreground", "held"])("refuses input when %s is unsafe", async (reason) => {
  const ready = await open();
  if (reason === "foreground") fixture.foreground.mockReturnValue(2n);
  else fixture.held.mockReturnValue(true);
  await ready({ sender: fixture.sender });
  expect(fixture.mouse).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1500);
  expect(fixture.exit).toHaveBeenCalledWith(1);
});

it("requires matching trusted observed events instead of assuming delivery means success", async () => {
  const ready = await open();
  await ready({ sender: fixture.sender });
  expect(fixture.mouse.mock.calls.map((call) => call[0])).toEqual([0xc001, 2, 4]);
  expect(fixture.exit).not.toHaveBeenCalled();
  const receive = fixture.on.mock.calls[0][1];
  for (const type of ["pointerdown", "pointerup", "click"]) {
    receive({ sender: fixture.sender }, { type, button: 0, x: 320, y: 200, trusted: true });
  }
  expect(fixture.exit).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1500);
  expect(fixture.exit).toHaveBeenCalledWith(0);
  expect(() => receive({ sender: null }, { type: "click" })).not.toThrow();
});

it("fails partial delivery without repeating the press", async () => {
  const ready = await open();
  fixture.mouse.mockReturnValueOnce(0);
  await ready({ sender: fixture.sender });
  expect(fixture.mouse).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1500);
  expect(fixture.exit).toHaveBeenCalledWith(1);
});

it("releases its button if target focus is lost after the press", async () => {
  const ready = await open();
  fixture.foreground.mockReturnValueOnce(1n).mockReturnValueOnce(1n).mockReturnValue(2n);
  await ready({ sender: fixture.sender });
  expect(fixture.mouse.mock.calls.map((call) => call[0])).toEqual([0xc001, 2, 4]);
  vi.advanceTimersByTime(1500);
  expect(fixture.exit).toHaveBeenCalledWith(1);
});
