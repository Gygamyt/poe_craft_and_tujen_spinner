import type { CalibrationDesktopApi } from "../../features/calibration/contracts";
import type { InputProbeApi, TestbedApi } from "../../features/testbed/contracts";
import type { CatalogDesktopApi } from "../../features/game-data/contracts";

declare global {
  interface Window {
    catalog: CatalogDesktopApi;
    testbed: TestbedApi;
    inputProbe: InputProbeApi;
    calibration: CalibrationDesktopApi;
  }
}
