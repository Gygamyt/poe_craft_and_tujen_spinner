import { describe, expect, it } from "vitest";
import {
  calibrationProfileSchema,
  layoutTemplateSchema,
  parseCalibrationProfile,
  slotLabel,
} from "../../src/features/calibration/domain/calibration-layout";
import { profileFixture, templateFixture } from "../fixtures/calibration";

describe("calibration layout contracts", () => {
  it("accepts four surfaces, anonymous slots and signed desktop coordinates", () => {
    const template = layoutTemplateSchema.parse(templateFixture());
    expect(Object.keys(template.pages)).toEqual(["general", "atlas", "league"]);
    expect(template.inventory).toEqual({ columns: 12, rows: 5 });
    expect(parseCalibrationProfile(template, profileFixture()).display.bounds.x).toBe(-1920);
    expect(slotLabel(template.pages.general.slots[0])).toBe("Slot 1");
  });

  it("keeps labels optional and independent of saved identity", () => {
    const template = templateFixture();
    template.pages.general.slots[0].defaultLabel = "Future currency name";
    const profile = parseCalibrationProfile(template, profileFixture());
    expect(slotLabel(template.pages.general.slots[0])).toBe("Future currency name");
    expect(profile.pages.general.slots[0].id).toBe("slot-001");
  });

  it("rejects duplicate IDs within a page but permits IDs shared across pages", () => {
    const template = templateFixture();
    template.pages.general.slots.push(structuredClone(template.pages.general.slots[0]));
    expect(layoutTemplateSchema.safeParse(template).success).toBe(false);
    expect(layoutTemplateSchema.safeParse(templateFixture()).success).toBe(true);
  });

  it.each([
    { x: -0.1, y: 0, width: 1, height: 1 },
    { x: 0, y: 0, width: 0, height: 1 },
    { x: 0.1, y: 0, width: 1, height: 1 },
    { x: 0, y: 0, width: 1, height: Infinity },
  ])("rejects invalid slot bounds %j", (bounds) => {
    const template = templateFixture();
    template.pages.general.slots[0].bounds = bounds;
    expect(layoutTemplateSchema.safeParse(template).success).toBe(false);
  });

  it("rejects unsupported formats, wrong grids and missing pages", () => {
    const template = templateFixture();
    expect(layoutTemplateSchema.safeParse({ ...template, schemaVersion: 2 }).success).toBe(false);
    expect(
      layoutTemplateSchema.safeParse({ ...template, inventory: { columns: 5, rows: 12 } }).success,
    ).toBe(false);
    expect(
      layoutTemplateSchema.safeParse({ ...template, pages: { general: template.pages.general } })
        .success,
    ).toBe(false);
    expect(
      calibrationProfileSchema.safeParse({ ...profileFixture(), schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it("rejects off-display areas and mismatched version or slot references", () => {
    const profile = profileFixture();
    profile.inventory.x = 1900;
    expect(calibrationProfileSchema.safeParse(profile).success).toBe(false);
    expect(() =>
      parseCalibrationProfile(templateFixture(), { ...profileFixture(), geometryVersion: "2" }),
    ).toThrow("different layout");
    const unknownSlot = profileFixture();
    unknownSlot.pages.general.slots[0].id = "missing";
    expect(() => parseCalibrationProfile(templateFixture(), unknownSlot)).toThrow("slot IDs");
  });
});
