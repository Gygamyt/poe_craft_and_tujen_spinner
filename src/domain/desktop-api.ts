import type { CalibrationProfile, PageId } from "./calibration-layout";

export const desktopChannels = {
  state: "calibration:state",
  preview: "calibration:preview",
  hide: "calibration:hide",
  changed: "calibration:changed",
} as const;

export interface DesktopState {
  profile: CalibrationProfile;
  page: PageId;
  visible: boolean;
  error?: string;
}

export interface CalibrationDesktopApi {
  getState(): Promise<DesktopState>;
  preview(page: PageId): Promise<void>;
  hide(): Promise<void>;
  onState(listener: (state: DesktopState) => void): () => void;
}
