import { screen, type BrowserWindow } from "electron";
import { setTimeout as sleep } from "node:timers/promises";
import { toAbsolute, toPhysical, type InputDriver } from "../../../features/input";
import type { Win32Input } from "../../windows/input/win32";

export function createTargetDriver(
  window: BrowserWindow,
  native: Win32Input,
  record: (data: unknown) => void,
) {
  const handle = window.getNativeWindowHandle().readBigUInt64LE();
  const viewport = () => {
    const [width, height] = window.getContentSize();
    return { width, height };
  };
  const geometry = () => {
    if (window.isDestroyed()) throw new Error("target-closed");
    const display = screen.getDisplayMatching(window.getBounds());
    return {
      client: native.client(handle),
      viewport: viewport(),
      desktop: native.desktop(),
      display: { id: display.id, scale: display.scaleFactor, rotation: display.rotation },
    };
  };
  const driver: InputDriver = {
    assertTarget(token) {
      if (window.isDestroyed() || native.foreground() !== handle) throw new Error("focus-lost");
      if (JSON.stringify(geometry()) !== token) throw new Error("geometry-changed");
    },
    held: () => [1, 2, 0x10, 0x11, 0x12].some((key) => native.held(key)),
    move(point) {
      const current = geometry();
      const absolute = toAbsolute(
        toPhysical(point, current.viewport, current.client),
        current.desktop,
      );
      const inserted = native.mouse(0xc001, absolute.x, absolute.y);
      record({ kind: "move", point, inserted });
      return inserted;
    },
    button(button, down) {
      const inserted = native.mouse(button === "primary" ? (down ? 2 : 4) : down ? 8 : 16);
      record({ kind: "button", button, down, inserted });
      return inserted;
    },
    shift(down) {
      const inserted = native.shift(down);
      record({ kind: "shift", down, inserted });
      return inserted;
    },
    now: () => performance.now(),
    sleep: async (ms, signal) => {
      await sleep(ms, undefined, { signal });
    },
  };
  return {
    driver,
    viewport,
    capture() {
      const current = geometry();
      const cursor = native.cursor();
      return {
        token: JSON.stringify(current),
        cursor: {
          x: ((cursor.x - current.client.x) * current.viewport.width) / current.client.width,
          y: ((cursor.y - current.client.y) * current.viewport.height) / current.client.height,
        },
      };
    },
  };
}
