import { describe, expect, it } from "vitest";
import { calibrationSchema } from "../../src/features/calibration/domain/calibration";

const area = { x: 20, y: 30, width: 120, height: 60 };
const inventory = { kind: "inventory", area, rows: 5, columns: 12 };
const stash = {
  kind: "currency-stash",
  area,
  slots: [{ id: "currency-a", bounds: { x: 100, y: 40, width: 20, height: 20 } }],
};

describe("calibration", () => {
  it("accepts a regular inventory grid and a stash slot flush with the edge", () => {
    expect(calibrationSchema.parse(inventory)).toEqual(inventory);
    expect(calibrationSchema.parse(stash)).toEqual(stash);
  });

  it.each([0, -1, 1.5])("rejects an invalid grid dimension (%s)", (rows) => {
    expect(calibrationSchema.safeParse({ ...inventory, rows }).success).toBe(false);
  });

  it("rejects a non-positive area or slot size", () => {
    const input = {
      ...stash,
      slots: [{ id: "currency-a", bounds: { x: 0, y: 0, width: 0, height: 20 } }],
    };

    expect(calibrationSchema.safeParse(input).success).toBe(false);
    expect(
      calibrationSchema.safeParse({ ...inventory, area: { ...area, height: -1 } }).success,
    ).toBe(false);
  });

  it("rejects duplicate IDs and slots extending beyond the stash", () => {
    const [slot] = stash.slots;
    const result = calibrationSchema.safeParse({
      ...stash,
      slots: [slot, { ...slot, bounds: { ...slot.bounds, x: 101 } }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ["slots", 1, "id"],
        ["slots", 1, "bounds"],
      ]);
    }
  });
});
