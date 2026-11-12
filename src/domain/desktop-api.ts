import type { CalibrationProfile, DisplaySnapshot, PageId } from "./calibration-layout";

export const desktopChannels = {
  state: "calibration:state",
  preview: "calibration:preview",
  hide: "calibration:hide",
  edit: "calibration:edit",
  cancel: "calibration:cancel",
  display: "calibration:display",
  changed: "calibration:changed",
} as const;

export interface DesktopState {
  profile: CalibrationProfile;
  page: PageId;
  visible: boolean;
  mode: "hidden" | "editing" | "preview";
  displays: DisplaySnapshot[];
  selectedDisplayId: number;
  requiresCalibration: boolean;
  error?: string;
}

export interface CalibrationDesktopApi {
  getState(): Promise<DesktopState>;
  preview(page: PageId): Promise<void>;
  hide(): Promise<void>;
  edit(): Promise<void>;
  cancel(): Promise<void>;
  selectDisplay(id: number): Promise<void>;
  onState(listener: (state: DesktopState) => void): () => void;
}
