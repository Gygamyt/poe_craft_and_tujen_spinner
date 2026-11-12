import type { CalibrationDesktopApi } from "../../features/calibration/contracts";

declare global {
  interface Window {
    calibration: CalibrationDesktopApi;
  }
}
