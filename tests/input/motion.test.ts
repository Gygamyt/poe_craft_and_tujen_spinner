import { expect, it } from "vitest";
import { planMotion, toAbsolute, toPhysical, type MotionRequest } from "../../src/features/input";

const request: MotionRequest = {
  seed: 0,
  enabled: true,
  start: { x: 30, y: 40 },
  target: { x: 450, y: 300, width: 30, height: 30 },
  viewport: { width: 800, height: 600 },
};
it("replays seeded motion, including seed zero", () => {
  expect(planMotion(request)).toEqual(planMotion(structuredClone(request)));
});
it("varies clicks and durations inside bounded geometry without leaving the viewport", () => {
  const plans = Array.from({ length: 100 }, (_, seed) => planMotion({ ...request, seed }));
  expect(new Set(plans.map((plan) => plan.click.x)).size).toBe(100);
  for (const plan of plans) {
    expect(plan.click.x).toBeGreaterThanOrEqual(454);
    expect(plan.click.x).toBeLessThanOrEqual(476);
    expect(plan.click.y).toBeGreaterThanOrEqual(304);
    expect(plan.click.y).toBeLessThanOrEqual(326);
    expect(plan.points[0]).toEqual({ ...request.start, at: 0 });
    expect(plan.points.at(-1)).toMatchObject(plan.click);
    expect(plan.points.at(-1)!.at).toBeGreaterThanOrEqual(550);
    expect(plan.points.at(-1)!.at).toBeLessThanOrEqual(850);
    expect(plan.hold).toBeGreaterThanOrEqual(45);
    expect(plan.hold).toBeLessThanOrEqual(100);
    plan.points.forEach((point, index) => {
      expect(point.x >= 0 && point.x < 800 && point.y >= 0 && point.y < 600).toBe(true);
      if (index) expect(point.at).toBeGreaterThan(plan.points[index - 1].at);
    });
  }
});
it.each([
  { enabled: false },
  { seed: -1 },
  { seed: 0x100000000 },
  { start: { x: -1, y: 0 } },
  { start: { x: 800, y: 0 } },
  { start: { x: NaN, y: 0 } },
  { viewport: { width: Infinity, height: 600 } },
  { target: { x: 790, y: 0, width: 30, height: 30 } },
  { target: { x: 0, y: 0, width: 8, height: 30 } },
  { settings: { durationMin: 900, durationMax: 500 } },
  { settings: { holdMin: 120, holdMax: 80 } },
  { settings: { steps: 10000 } },
  { settings: { durationMax: NaN } },
])("rejects unusable targets, timing and seeds: %j", (overrides) => {
  expect(() => planMotion({ ...request, ...overrides })).toThrow();
});
it.each([1, 1.25, 1.5, 2])(
  "maps local DIP to a negative-origin physical client at scale %s",
  (scale) => {
    const client = { x: -1920, y: -300, width: 800 * scale, height: 600 * scale };
    expect(toPhysical({ x: 100, y: 100 }, request.viewport, client)).toEqual({
      x: -1920 + 100 * scale,
      y: -300 + 100 * scale,
    });
  },
);
it("normalizes the full signed virtual desktop and rejects out-of-bounds input", () => {
  const desktop = { x: -1920, y: -300, width: 5360, height: 1740 };
  expect(toAbsolute({ x: -1920, y: -300 }, desktop)).toEqual({ x: 0, y: 0 });
  expect(toAbsolute({ x: 3439, y: 1439 }, desktop)).toEqual({ x: 65535, y: 65535 });
  expect(() => toAbsolute({ x: 3440, y: 0 }, desktop)).toThrow();
  expect(() => toPhysical({ x: 0, y: 0 }, { width: Infinity, height: 1 }, desktop)).toThrow();
});
