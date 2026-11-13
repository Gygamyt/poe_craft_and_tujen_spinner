import type { CalibrationDesktopApi } from "../../features/calibration/contracts";
import type { InputProbeApi } from "../../features/testbed/contracts";

declare global {
  interface Window {
    inputProbe: InputProbeApi;
    calibration: CalibrationDesktopApi;
  }
}
