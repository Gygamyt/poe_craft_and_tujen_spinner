import { expect, it, vi } from "vitest";
import { testbedChannels, type TestbedApi } from "../../src/features/testbed/contracts";
const bridge = vi.hoisted(() => ({
  expose: vi.fn(),
  invoke: vi.fn(async () => undefined),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld: bridge.expose },
  ipcRenderer: bridge,
}));
import "../../src/preload";
const api = () => bridge.expose.mock.calls.find(([name]) => name === "testbed")![1] as TestbedApi;
it("exposes only named testbed operations and no generic IPC/SQL/filesystem escape hatch", async () => {
  expect(Object.keys(api()).sort()).toEqual(
    ["open", "getState", "command", "observed", "onState"].sort(),
  );
  await api().open();
  expect(bridge.invoke).toHaveBeenLastCalledWith(testbedChannels.open);
  await api().command({ kind: "stop" });
  expect(bridge.invoke).toHaveBeenLastCalledWith(testbedChannels.command, { kind: "stop" });
});
it("removes state listeners and propagates main-process errors", async () => {
  const dispose = api().onState(() => {});
  dispose();
  expect(bridge.removeListener).toHaveBeenCalledWith(
    testbedChannels.changed,
    bridge.on.mock.calls[0][1],
  );
  bridge.invoke.mockRejectedValueOnce(new Error("Unauthorized"));
  await expect(api().getState()).rejects.toThrow("Unauthorized");
});
