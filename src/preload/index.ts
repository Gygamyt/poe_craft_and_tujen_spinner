import { contextBridge, ipcRenderer } from "electron";
import { catalogChannels, type CatalogDesktopApi } from "../features/game-data/contracts";
const catalog: CatalogDesktopApi = {
  open: () => ipcRenderer.invoke(catalogChannels.open),
  status: () => ipcRenderer.invoke(catalogChannels.status),
  query: (query) => ipcRenderer.invoke(catalogChannels.query, query),
  detail: (kind, id, snapshotId) =>
    ipcRenderer.invoke(catalogChannels.detail, { kind, id, snapshotId }),
  activate: (id) => ipcRenderer.invoke(catalogChannels.activate, id),
  chooseImport: () => ipcRenderer.invoke(catalogChannels.import),
};
contextBridge.exposeInMainWorld("catalog", catalog);
import {
  probeChannels,
  testbedChannels,
  type InputProbeApi,
  type TestbedApi,
} from "../features/testbed/contracts";
import {
  desktopChannels,
  type CalibrationDesktopApi,
  type DesktopState,
  type DesktopResult,
} from "../features/calibration/contracts";

async function command(channel: string, payload?: unknown): Promise<void> {
  const result: DesktopResult = await ipcRenderer.invoke(channel, payload);
  if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
}

const api: CalibrationDesktopApi = {
  getState: () => ipcRenderer.invoke(desktopChannels.state),
  preview: (page) => command(desktopChannels.preview, page),
  hide: () => command(desktopChannels.hide),
  edit: () => command(desktopChannels.edit),
  cancel: () => command(desktopChannels.cancel),
  selectDisplay: (id) => command(desktopChannels.display, id),
  selectPage: (page) => command(desktopChannels.page, page),
  setVisibility: (inventory, stash) => command(desktopChannels.visibility, { inventory, stash }),
  updateProfile: (profile) => command(desktopChannels.update, profile),
  save: () => command(desktopChannels.save),
  selectLayout: (key) => command(desktopChannels.layout, key),
  chooseImport: () => command(desktopChannels.chooseImport),
  confirmImport: () => command(desktopChannels.confirmImport),
  cancelImport: () => command(desktopChannels.cancelImport),
  reset: () => command(desktopChannels.reset),
  onState(listener) {
    const handler = (_event: Electron.IpcRendererEvent, state: DesktopState) => listener(state);
    ipcRenderer.on(desktopChannels.changed, handler);
    return () => ipcRenderer.removeListener(desktopChannels.changed, handler);
  },
};
contextBridge.exposeInMainWorld("calibration", api);
const probe: InputProbeApi = {
  ready: () => ipcRenderer.invoke(probeChannels.ready),
  received: (event) => ipcRenderer.send(probeChannels.received, event),
  onResult(listener) {
    const handler = (_event: Electron.IpcRendererEvent, result: { ok: boolean; error?: string }) =>
      listener(result);
    ipcRenderer.on(probeChannels.result, handler);
    return () => ipcRenderer.removeListener(probeChannels.result, handler);
  },
};
contextBridge.exposeInMainWorld("inputProbe", probe);
const testbed: TestbedApi = {
  open: () => ipcRenderer.invoke(testbedChannels.open),
  getState: () => ipcRenderer.invoke(testbedChannels.state),
  command: (value) => ipcRenderer.invoke(testbedChannels.command, value),
  observed: (value) => ipcRenderer.send(testbedChannels.observed, value),
  onState(listener) {
    const handler = (_event: Electron.IpcRendererEvent, state: Parameters<typeof listener>[0]) =>
      listener(state);
    ipcRenderer.on(testbedChannels.changed, handler);
    return () => ipcRenderer.removeListener(testbedChannels.changed, handler);
  },
};
contextBridge.exposeInMainWorld("testbed", testbed);
