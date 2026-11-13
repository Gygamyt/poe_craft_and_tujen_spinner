import { expect, it, vi } from "vitest";
import type { BrowserWindow } from "electron";
import type { Win32Input } from "../../src/platform/windows/input/win32";
const display = vi.hoisted(() => ({ id: 1, scaleFactor: 1.25, rotation: 0 }));
vi.mock("electron", () => ({ screen: { getDisplayMatching: () => display } }));
import { createTargetDriver } from "../../src/platform/electron/testbed/target-driver";

function fixture() {
  display.scaleFactor = 1.25;
  const state = { closed: false, foreground: 1n, x: -1000, width: 1000 };
  const window = {
    getNativeWindowHandle: () => {
      const value = Buffer.alloc(8);
      value.writeBigUInt64LE(1n);
      return value;
    },
    getContentSize: () => [800, 600],
    getBounds: () => ({ x: -800, y: 0, width: 800, height: 600 }),
    isDestroyed: () => state.closed,
  } as unknown as BrowserWindow;
  const mouse = vi.fn(() => 1);
  const native = {
    foreground: () => state.foreground,
    client: () => ({ x: state.x, y: 0, width: state.width, height: 750 }),
    desktop: () => ({ x: -1920, y: -300, width: 5360, height: 1740 }),
    cursor: () => ({ x: -500, y: 125 }),
    held: () => false,
    mouse,
    shift: () => 1,
  } as unknown as Win32Input;
  return { state, mouse, ...createTargetDriver(window, native, () => {}) };
}
it("captures signed physical geometry and converts the actual cursor to client DIP", () => {
  const f = fixture();
  const captured = f.capture();
  expect(captured.cursor).toEqual({ x: 400, y: 100 });
  expect(() => f.driver.assertTarget(captured.token)).not.toThrow();
});
it.each(["closed", "focus", "bounds", "scale"])(
  "invalidates an authorized plan on %s changes",
  (reason) => {
    const f = fixture();
    const { token } = f.capture();
    if (reason === "closed") f.state.closed = true;
    if (reason === "focus") f.state.foreground = 2n;
    if (reason === "bounds") f.state.width++;
    if (reason === "scale") display.scaleFactor = 1.5;
    expect(() => f.driver.assertTarget(token)).toThrow();
    expect(f.mouse).not.toHaveBeenCalled();
  },
);
it("allows owned-input cleanup after window destruction without querying geometry", () => {
  const f = fixture();
  f.state.closed = true;
  expect(f.driver.button("primary", false)).toBe(1);
  expect(f.mouse).toHaveBeenCalledWith(4);
});
