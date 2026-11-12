import { expect, it } from "vitest";
import { previewControlBounds } from "../src/main/preview-controls";
import { profileFixture } from "./fixtures/calibration";

it.each([
  { x: 0, y: 0, width: 2752, height: 1152 },
  { x: -1920, y: -100, width: 1920, height: 1080 },
  { x: 10, y: 20, width: 240, height: 60 },
])("keeps compact controls inside the selected display %j without DPI multiplication", (bounds) => {
  const result = previewControlBounds({ ...profileFixture().display, bounds });
  expect(result.x).toBeGreaterThanOrEqual(bounds.x);
  expect(result.y).toBeGreaterThanOrEqual(bounds.y);
  expect(result.x + result.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  expect(result.y + result.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  expect(result.width).toBe(Math.min(280, bounds.width));
});
