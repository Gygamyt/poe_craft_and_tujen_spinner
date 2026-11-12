export {
  type GeometryTarget,
  type GeometryHandle,
  targetRectangle,
  applyCalibrationGesture,
  setSlotEnabled,
} from "./domain/calibration-editor";
export {
  type Point,
  type ResizeCorner,
  materializeSlot,
  inventoryCells,
  moveRectangle,
  resizeRectangle,
  localToDesktop,
  createCalibrationProfile,
} from "./domain/calibration-geometry";
export {
  pageIds,
  pageIdSchema,
  normalizedRectangleSchema,
  layoutTemplateSchema,
  displaySnapshotSchema,
  calibrationProfileSchema,
  type Rectangle,
  type PageId,
  type LayoutTemplate,
  type DisplaySnapshot,
  type CalibrationProfile,
  slotLabel,
  parseCalibrationProfile,
} from "./domain/calibration-layout";
export { buildCalibrationScene } from "./domain/calibration-scene";
export { acceptDesktopSnapshot, saveEditedProfile } from "./domain/calibration-snapshot";
export {
  layoutKey,
  displayKey,
  profileKey,
  geometrySignature,
  mergeTemplate,
  workspaceSchema,
  type CalibrationWorkspace,
  createWorkspace,
  saveProfile,
} from "./domain/calibration-workspace";
export { rectangleSchema, calibrationSchema, type Calibration } from "./domain/calibration";
export { bundledLayout } from "./layouts";
