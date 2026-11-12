import {
  type CalibrationProfile,
  type LayoutTemplate,
} from "../../src/features/calibration/domain/calibration-layout";

export function templateFixture(): LayoutTemplate {
  const page = () => ({ slots: [{ id: "slot-001", bounds: { x: 0, y: 0, width: 1, height: 1 } }] });
  return {
    schemaVersion: 1,
    layoutId: "synthetic",
    geometryVersion: "1",
    inventory: { columns: 12, rows: 5 },
    pages: { general: page(), atlas: page(), league: page() },
  };
}

export function profileFixture(): CalibrationProfile {
  const page = () => ({
    area: { x: 10, y: 20, width: 100, height: 100 },
    slots: [{ id: "slot-001", bounds: { x: 0, y: 0, width: 1, height: 1 }, enabled: true }],
  });
  return {
    schemaVersion: 1,
    layoutId: "synthetic",
    geometryVersion: "1",
    display: {
      id: 1,
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1.5,
      rotation: 0,
    },
    inventory: { x: 1000, y: 600, width: 600, height: 250 },
    pages: { general: page(), atlas: page(), league: page() },
  };
}
