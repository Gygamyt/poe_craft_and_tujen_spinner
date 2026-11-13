import type { CalibrationDesktopApi } from "../../features/calibration/contracts";
import type { InputProbeApi, TestbedApi } from "../../features/testbed/contracts";

declare global {
  interface Window {
    testbed: TestbedApi;
    inputProbe: InputProbeApi;
    calibration: CalibrationDesktopApi;
  }
}
