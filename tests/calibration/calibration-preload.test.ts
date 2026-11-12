import { expect, it, vi } from "vitest";
import type { CalibrationDesktopApi } from "../../src/features/calibration/contracts";
import { desktopChannels } from "../../src/features/calibration/contracts";

const bridge = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(async (): Promise<unknown> => ({ ok: true })),
  on: vi.fn(),
  removeListener: vi.fn(),
}));
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld: bridge.exposeInMainWorld },
  ipcRenderer: bridge,
}));
import "../../src/preload";

it("exposes only named operations and never accepts a renderer-supplied file path", async () => {
  const [name, exposed] = bridge.exposeInMainWorld.mock.calls[0];
  const api = exposed as CalibrationDesktopApi;
  expect(name).toBe("calibration");
  expect(Object.keys(api).sort()).toEqual(
    [
      "getState",
      "preview",
      "hide",
      "edit",
      "cancel",
      "selectDisplay",
      "selectPage",
      "setVisibility",
      "updateProfile",
      "save",
      "selectLayout",
      "chooseImport",
      "confirmImport",
      "cancelImport",
      "reset",
      "onState",
    ].sort(),
  );
  await api.chooseImport();
  expect(bridge.invoke).toHaveBeenLastCalledWith(desktopChannels.chooseImport, undefined);
  const unsubscribe = api.onState(vi.fn());
  const handler = bridge.on.mock.calls[0][1];
  unsubscribe();
  expect(bridge.removeListener).toHaveBeenCalledWith(desktopChannels.changed, handler);
});

it("preserves typed operation error codes across the bridge", async () => {
  const api = bridge.exposeInMainWorld.mock.calls[0][1] as CalibrationDesktopApi;
  bridge.invoke.mockResolvedValueOnce({
    ok: false,
    error: { code: "invalid-request", message: "Invalid request" },
  });
  await expect(api.save()).rejects.toMatchObject({
    code: "invalid-request",
    message: "Invalid request",
  });
});
