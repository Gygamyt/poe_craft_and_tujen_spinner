import { describe, expect, it } from "vitest";
import {
  applyCalibrationGesture,
  setSlotEnabled,
  targetRectangle,
} from "../../src/features/calibration/domain/calibration-editor";
import {
  createCalibrationProfile,
  inventoryCells,
} from "../../src/features/calibration/domain/calibration-geometry";
import { parseCalibrationProfile } from "../../src/features/calibration/domain/calibration-layout";
import { bundledLayout } from "../../src/features/calibration/layouts";
import { profileFixture } from "../fixtures/calibration";

describe("calibration editor gestures", () => {
  const fixture = () => createCalibrationProfile(bundledLayout, profileFixture().display);
  it("moves and resizes inventory from the gesture start while keeping 60 equal cells", () => {
    const initial = fixture();
    const moved = applyCalibrationGesture(initial, { kind: "inventory" }, "move", {
      x: -100,
      y: -100,
    });
    const resized = applyCalibrationGesture(moved, { kind: "inventory" }, "se", {
      x: 50.25,
      y: 20.5,
    });
    expect(initial.inventory).not.toEqual(moved.inventory);
    expect(resized.pages).toEqual(initial.pages);
    expect(inventoryCells(resized.inventory)).toHaveLength(60);
    expect(parseCalibrationProfile(bundledLayout, resized)).toEqual(resized);
  });

  it("rescales a stash frame without altering relative slot positions or other pages", () => {
    const initial = fixture();
    const result = applyCalibrationGesture(initial, { kind: "page", page: "general" }, "se", {
      x: 80,
      y: 60,
    });
    expect(result.pages.general.area).not.toEqual(initial.pages.general.area);
    expect(result.pages.general.slots).toEqual(initial.pages.general.slots);
    expect(result.pages.atlas).toEqual(initial.pages.atlas);
    expect(result.pages.league).toEqual(initial.pages.league);
    expect(parseCalibrationProfile(bundledLayout, result)).toEqual(result);
  });

  it.each(["general", "atlas", "league"] as const)(
    "adjusts only the selected slot in %s, including edge clamping",
    (page) => {
      const initial = fixture();
      const slotId = initial.pages[page].slots[0].id;
      const target = { kind: "slot" as const, page, slotId };
      const moved = applyCalibrationGesture(initial, target, "move", { x: 1e6, y: 1e6 });
      const result = applyCalibrationGesture(moved, target, "nw", { x: -10.125, y: -12.25 });
      expect(result.pages[page].slots.slice(1)).toEqual(initial.pages[page].slots.slice(1));
      expect(result.pages[page].slots[0].id).toBe(slotId);
      expect(parseCalibrationProfile(bundledLayout, result)).toEqual(result);
      expect(targetRectangle(result, target).width).toBeGreaterThan(0);
    },
  );

  it("disables and restores the same slot without changing its identity or geometry", () => {
    const initial = fixture();
    const disabled = setSlotEnabled(initial, "atlas", "slot-001", false);
    expect(disabled.pages.atlas.slots[0].enabled).toBe(false);
    expect(setSlotEnabled(disabled, "atlas", "slot-001", true)).toEqual(initial);
  });
});
