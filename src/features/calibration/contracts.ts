import type {
  CalibrationProfile,
  DisplaySnapshot,
  LayoutTemplate,
  PageId,
} from "./domain/calibration-layout";

export const desktopChannels = {
  state: "calibration:state",
  preview: "calibration:preview",
  hide: "calibration:hide",
  edit: "calibration:edit",
  cancel: "calibration:cancel",
  display: "calibration:display",
  page: "calibration:page",
  visibility: "calibration:visibility",
  update: "calibration:update",
  save: "calibration:save",
  layout: "calibration:layout",
  chooseImport: "calibration:choose-import",
  confirmImport: "calibration:confirm-import",
  cancelImport: "calibration:cancel-import",
  reset: "calibration:reset",
  changed: "calibration:changed",
} as const;

export type OverlayMode = "hidden" | "editing" | "preview";

export interface DesktopState {
  revision: number;
  profile: CalibrationProfile;
  page: PageId;
  visible: boolean;
  mode: OverlayMode;
  displays: DisplaySnapshot[];
  selectedDisplayId: number;
  requiresCalibration: boolean;
  templates: LayoutTemplate[];
  activeLayoutKey: string;
  inventoryVisible: boolean;
  stashVisible: boolean;
  busy: boolean;
  recoveryRequired: boolean;
  pendingImport?: { template: LayoutTemplate; kind: "new" | "metadata" };
  error?: string;
}

export interface CalibrationDesktopApi {
  getState(): Promise<DesktopState>;
  preview(page: PageId): Promise<void>;
  hide(): Promise<void>;
  edit(): Promise<void>;
  cancel(): Promise<void>;
  selectDisplay(id: number): Promise<void>;
  selectPage(page: PageId): Promise<void>;
  setVisibility(inventory: boolean, stash: boolean): Promise<void>;
  updateProfile(profile: CalibrationProfile): Promise<void>;
  save(): Promise<void>;
  selectLayout(key: string): Promise<void>;
  chooseImport(): Promise<void>;
  confirmImport(): Promise<void>;
  cancelImport(): Promise<void>;
  reset(): Promise<void>;
  onState(listener: (state: DesktopState) => void): () => void;
}

export type DesktopResult =
  | { ok: true }
  | { ok: false; error: { code: "invalid-request" | "operation-failed"; message: string } };
