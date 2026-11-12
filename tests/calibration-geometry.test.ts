import { describe, expect, it } from "vitest";
import {
  createCalibrationProfile,
  inventoryCells,
  localToDesktop,
  materializeSlot,
  moveRectangle,
  resizeRectangle,
} from "../src/domain/calibration-geometry";
import { parseCalibrationProfile } from "../src/domain/calibration-layout";
import { bundledLayout } from "../src/layouts";
import { profileFixture } from "./fixtures/calibration";

const displayCases = [
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [3840, 2160],
  [5120, 1440],
].flatMap(([width, height]) =>
  [1, 1.25, 1.5, 2].map((scaleFactor) => ({ width, height, scaleFactor })),
);

describe("calibration geometry", () => {
  const area = { x: 10.25, y: 20.5, width: 120.5, height: 50.25 };
  const extent = { width: 200, height: 150 };

  it("divides the full area into 60 equal cells without repeated rounding", () => {
    const cells = inventoryCells(area);
    expect(cells).toHaveLength(60);
    expect(new Set(cells.map((cell) => cell.width)).size).toBe(1);
    expect(new Set(cells.map((cell) => cell.height)).size).toBe(1);
    const last = cells[59];
    expect(last.x + last.width).toBeCloseTo(area.x + area.width, 12);
    expect(last.y + last.height).toBeCloseTo(area.y + area.height, 12);
  });

  it("materializes a slot flush with the edge and rejects overflow", () => {
    expect(materializeSlot(area, { x: 0.5, y: 0.5, width: 0.5, height: 0.5 })).toEqual({
      x: 70.5,
      y: 45.625,
      width: 60.25,
      height: 25.125,
    });
    expect(() => materializeSlot(area, { x: 0.51, y: 0, width: 0.5, height: 1 })).toThrow();
  });

  it("clamps moves and preserves dimensions", () => {
    expect(moveRectangle(area, { x: -1000, y: 1000 }, extent)).toEqual({ ...area, x: 0, y: 99.75 });
    expect(() => moveRectangle(area, { x: NaN, y: 0 }, extent)).toThrow();
    expect(() => moveRectangle(area, { x: 0, y: 0 }, { width: 10, height: 10 })).toThrow();
  });

  it("resizes all four corners while preserving the opposite corner", () => {
    for (const corner of ["nw", "ne", "sw", "se"] as const) {
      const result = resizeRectangle(area, corner, { x: 2.5, y: 3.5 }, extent);
      expect(result.x).toBe(corner.endsWith("w") ? 12.75 : area.x);
      expect(result.y).toBe(corner.startsWith("n") ? 24 : area.y);
      expect(result.width).toBe(area.width + (corner.endsWith("e") ? 2.5 : -2.5));
      expect(result.height).toBe(area.height + (corner.startsWith("s") ? 3.5 : -3.5));
    }
    expect(resizeRectangle(area, "nw", { x: 1000, y: 1000 }, extent)).toMatchObject({
      width: 1,
      height: 1,
    });
    expect(resizeRectangle(area, "se", { x: 1000, y: 1000 }, extent)).toMatchObject({
      width: 189.75,
      height: 129.5,
    });
  });

  it.each([1, 1.5])("uses DIP exactly once at scale %s on a left-hand monitor", (scaleFactor) => {
    const display = { ...profileFixture().display, scaleFactor };
    expect(localToDesktop(display, { x: 100.5, y: 200.25 })).toEqual({ x: -1819.5, y: 200.25 });
  });

  it("creates valid independent surfaces and round-trips without geometry drift", () => {
    const profile = createCalibrationProfile(bundledLayout, profileFixture().display);
    const restored = parseCalibrationProfile(bundledLayout, JSON.parse(JSON.stringify(profile)));
    expect(restored).toEqual(profile);
    expect(restored.pages.general.slots.every((slot) => slot.enabled)).toBe(true);
    restored.pages.general.slots[0].enabled = false;
    expect(restored.pages.atlas.slots[0].enabled).toBe(true);
    expect(profile.pages.general.slots[0].enabled).toBe(true);
  });

  it.each(displayCases)(
    "fits all surfaces at $width × $height physical pixels, scale $scaleFactor",
    ({ width, height, scaleFactor }) => {
      const display = {
        id: 1,
        bounds: {
          x: -Math.round(width / scaleFactor),
          y: 0,
          width: Math.round(width / scaleFactor),
          height: Math.round(height / scaleFactor),
        },
        scaleFactor,
        rotation: 0,
      };
      const profile = createCalibrationProfile(bundledLayout, display);
      const cells = inventoryCells(profile.inventory);
      expect(cells).toHaveLength(60);
      const rectangles = [
        ...cells,
        ...Object.values(profile.pages).flatMap((page) =>
          page.slots.map((slot) => materializeSlot(page.area, slot.bounds)),
        ),
      ];
      for (const rectangle of rectangles) {
        expect(rectangle.x).toBeGreaterThanOrEqual(0);
        expect(rectangle.y).toBeGreaterThanOrEqual(0);
        expect(rectangle.width).toBeGreaterThan(0);
        expect(rectangle.height).toBeGreaterThan(0);
        expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(display.bounds.width);
        expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(display.bounds.height);
      }
      const moved = moveRectangle(profile.inventory, { x: -1e6, y: 1e6 }, display.bounds);
      const resized = resizeRectangle(moved, "ne", { x: 1e6, y: -1e6 }, display.bounds);
      expect(resized.x + resized.width).toBe(display.bounds.width);
      expect(resized.y).toBe(0);
      expect(localToDesktop(display, { x: 100, y: 50 }).x).toBe(display.bounds.x + 100);
      expect(parseCalibrationProfile(bundledLayout, JSON.parse(JSON.stringify(profile)))).toEqual(
        profile,
      );
    },
  );
});
