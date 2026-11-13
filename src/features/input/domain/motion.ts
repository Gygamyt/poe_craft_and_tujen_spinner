import { z } from "zod";
import type { MotionPlan, MotionRequest, MotionSettings, Point, Rectangle } from "../contracts";

const settingsSchema = z
  .strictObject({
    durationMin: z.number().min(100).max(3000),
    durationMax: z.number().min(100).max(3000),
    holdMin: z.number().min(20).max(200),
    holdMax: z.number().min(20).max(200),
    steps: z.int().min(12).max(120),
    inset: z.number().min(2).max(20),
  })
  .refine(
    (value) => value.durationMin <= value.durationMax && value.holdMin <= value.holdMax,
    "Reversed timing bounds",
  );
export const defaultMotionSettings: MotionSettings = {
  durationMin: 550,
  durationMax: 850,
  holdMin: 45,
  holdMax: 100,
  steps: 36,
  inset: 4,
};

/** Mulberry32, including seed zero. Reproducibility is scoped to planner version 1. */
export function seededRandom(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid seed");
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const finite = (values: number[]) => values.every(Number.isFinite);
const inside = (point: Point, width: number, height: number) =>
  finite([point.x, point.y]) && point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;

export function planMotion(request: MotionRequest): MotionPlan {
  const { seed, start, target, viewport, enabled } = request;
  const random = seededRandom(seed);
  const settings = settingsSchema.parse({ ...defaultMotionSettings, ...request.settings });
  if (
    !enabled ||
    !finite([viewport.width, viewport.height]) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    !inside(start, viewport.width, viewport.height) ||
    !finite([target.x, target.y, target.width, target.height]) ||
    target.x < 0 ||
    target.y < 0 ||
    target.x + target.width > viewport.width ||
    target.y + target.height > viewport.height ||
    target.width <= 2 * settings.inset ||
    target.height <= 2 * settings.inset
  ) {
    throw new Error("Target or starting cursor is outside the usable viewport");
  }
  const click = {
    x: target.x + settings.inset + random() * (target.width - 2 * settings.inset),
    y: target.y + settings.inset + random() * (target.height - 2 * settings.inset),
  };
  const control = (fraction: number): Point => ({
    x: Math.max(
      0,
      Math.min(
        viewport.width - 0.001,
        start.x +
          (click.x - start.x) * fraction +
          (random() - 0.5) * Math.min(100, viewport.width * 0.15),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        viewport.height - 0.001,
        start.y +
          (click.y - start.y) * fraction +
          (random() - 0.5) * Math.min(100, viewport.height * 0.15),
      ),
    ),
  });
  const first = control(1 / 3),
    second = control(2 / 3);
  const duration = settings.durationMin + random() * (settings.durationMax - settings.durationMin);
  const points = Array.from({ length: settings.steps + 1 }, (_, index) => {
    const t = index / settings.steps;
    const u = t * t * (3 - 2 * t),
      inverse = 1 - u;
    return {
      x:
        inverse ** 3 * start.x +
        3 * inverse ** 2 * u * first.x +
        3 * inverse * u ** 2 * second.x +
        u ** 3 * click.x,
      y:
        inverse ** 3 * start.y +
        3 * inverse ** 2 * u * first.y +
        3 * inverse * u ** 2 * second.y +
        u ** 3 * click.y,
      at: duration * t,
    };
  });
  return {
    version: 1,
    seed,
    points,
    click,
    hold: settings.holdMin + random() * (settings.holdMax - settings.holdMin),
  };
}

export function toPhysical(
  point: Point,
  viewport: { width: number; height: number },
  client: Rectangle,
): Point {
  if (
    !finite([viewport.width, viewport.height]) ||
    !inside(point, viewport.width, viewport.height) ||
    !finite([client.x, client.y, client.width, client.height]) ||
    client.width < 1 ||
    client.height < 1
  )
    throw new Error("Invalid coordinate mapping");
  return {
    x: client.x + Math.min(client.width - 1, Math.round((point.x * client.width) / viewport.width)),
    y:
      client.y +
      Math.min(client.height - 1, Math.round((point.y * client.height) / viewport.height)),
  };
}

export function toAbsolute(point: Point, desktop: Rectangle): Point {
  if (
    !finite([point.x, point.y, desktop.x, desktop.y, desktop.width, desktop.height]) ||
    desktop.width <= 1 ||
    desktop.height <= 1 ||
    point.x < desktop.x ||
    point.y < desktop.y ||
    point.x >= desktop.x + desktop.width ||
    point.y >= desktop.y + desktop.height
  )
    throw new Error("Point outside virtual desktop");
  return {
    x: Math.min(65535, Math.round(((point.x - desktop.x) * 65535) / (desktop.width - 1))),
    y: Math.min(65535, Math.round(((point.y - desktop.y) * 65535) / (desktop.height - 1))),
  };
}
