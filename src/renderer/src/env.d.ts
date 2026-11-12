import type { CalibrationDesktopApi } from "../../domain/desktop-api";

declare global {
  interface Window {
    calibration: CalibrationDesktopApi;
  }
}
