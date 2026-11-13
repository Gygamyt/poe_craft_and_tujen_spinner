import { expect, it } from "vitest";
import {
  validatePlacements,
  itemAtCell,
  itemAtPoint,
  projectPlacement,
  assertItemContext,
  type Placement,
} from "../../src/features/inventory";
import { planMotion } from "../../src/features/input";
const grid = { columns: 12, rows: 5 };
const placement = (change: Partial<Placement> = {}): Placement => ({
  instanceId: "item",
  baseId: "base",
  snapshotId: "snapshot",
  revision: 1,
  column: 4,
  row: 1,
  width: 2,
  height: 3,
  ...change,
});
it.each([
  [1, 1],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 2],
  [4, 1],
])("owns every occupied cell for %sx%s", (width, height) => {
  const item = placement({ width, height });
  validatePlacements(grid, [item]);
  for (let row = 0; row < 5; row++)
    for (let column = 0; column < 12; column++) {
      const occupied = column >= 4 && column < 4 + width && row >= 1 && row < 1 + height;
      expect(itemAtCell(grid, [item], column, row)?.instanceId).toBe(occupied ? "item" : undefined);
    }
});
it("accepts exact edges and adjacent items with half-open point ownership", () => {
  const a = placement({ column: 0, row: 0, width: 2, height: 5 });
  const b = placement({ instanceId: "b", column: 2, row: 0, width: 10, height: 5 });
  const area = { x: 10, y: 20, width: 120, height: 50 };
  expect(itemAtPoint(grid, [a, b], area, { x: 30, y: 20 })?.instanceId).toBe("b");
  expect(itemAtPoint(grid, [a, b], area, { x: 130, y: 20 })).toBeUndefined();
  expect(itemAtPoint(grid, [a], area, { x: 40, y: 20 })).toBeUndefined();
});
it.each([
  { column: -1 },
  { row: 1.5 },
  { width: 0 },
  { height: NaN },
  { column: 11 },
  { revision: -1 },
  { width: undefined },
])("rejects invalid placement %j", (value) => {
  expect(() => validatePlacements(grid, [placement(value)])).toThrow();
});
it("rejects duplicate identity and overlap without mutating inputs", () => {
  const items = [placement(), placement({ instanceId: "other", column: 5 })];
  const before = structuredClone(items);
  expect(() => validatePlacements(grid, items)).toThrow("overlap");
  expect(items).toEqual(before);
  expect(() => validatePlacements(grid, [placement(), placement()])).toThrow("duplicate");
});
it.each([
  { x: 0, y: 0, width: 600, height: 250 },
  { x: 120, y: 90, width: 960, height: 400 },
  { x: 10, y: 10, width: 344, height: 144 },
])("projects cell proportions and keeps seeded clicks inside the inset %j", (area) => {
  const target = projectPlacement(grid, [placement()], "item", area);
  expect(target.width).toBeCloseTo(area.width / 6);
  expect(target.height).toBeCloseTo((area.height * 3) / 5);
  for (let seed = 0; seed < 100; seed++) {
    const plan = planMotion({
      seed,
      start: { x: 0, y: 0 },
      target,
      viewport: { width: 2000, height: 1000 },
      enabled: true,
    });
    expect(plan.click.x).toBeGreaterThanOrEqual(target.x + 4);
    expect(plan.click.x).toBeLessThan(target.x + target.width - 4);
    expect(itemAtPoint(grid, [placement()], area, plan.click)?.instanceId).toBe("item");
  }
});
it("rejects insufficient target area and every stale identity component", () => {
  const target = projectPlacement(grid, [placement()], "item", {
    x: 0,
    y: 0,
    width: 12,
    height: 5,
  });
  expect(() =>
    planMotion({
      seed: 1,
      start: { x: 0, y: 0 },
      target,
      viewport: { width: 100, height: 100 },
      enabled: true,
    }),
  ).toThrow();
  for (const change of [{ instanceId: "b" }, { baseId: "b" }, { snapshotId: "b" }, { revision: 2 }])
    expect(() => assertItemContext(placement(), placement(change))).toThrow("stale");
});
