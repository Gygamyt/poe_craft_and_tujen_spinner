import { contextBridge, ipcRenderer } from "electron";
import {
  desktopChannels,
  type CalibrationDesktopApi,
  type DesktopState,
} from "../domain/desktop-api";

const api: CalibrationDesktopApi = {
  getState: () => ipcRenderer.invoke(desktopChannels.state),
  preview: (page) => ipcRenderer.invoke(desktopChannels.preview, page),
  hide: () => ipcRenderer.invoke(desktopChannels.hide),
  edit: () => ipcRenderer.invoke(desktopChannels.edit),
  cancel: () => ipcRenderer.invoke(desktopChannels.cancel),
  selectDisplay: (id) => ipcRenderer.invoke(desktopChannels.display, id),
  onState(listener) {
    const handler = (_event: Electron.IpcRendererEvent, state: DesktopState) => listener(state);
    ipcRenderer.on(desktopChannels.changed, handler);
    return () => ipcRenderer.removeListener(desktopChannels.changed, handler);
  },
};
contextBridge.exposeInMainWorld("calibration", api);
