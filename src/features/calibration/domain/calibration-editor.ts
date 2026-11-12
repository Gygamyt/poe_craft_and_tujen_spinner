import {
  materializeSlot,
  moveRectangle,
  resizeRectangle,
  type Point,
  type ResizeCorner,
} from "./calibration-geometry";
import type { CalibrationProfile, PageId, Rectangle } from "./calibration-layout";

export type GeometryTarget =
  | { kind: "inventory" }
  | { kind: "page"; page: PageId }
  | { kind: "slot"; page: PageId; slotId: string };
export type GeometryHandle = "move" | ResizeCorner;

export function targetRectangle(profile: CalibrationProfile, target: GeometryTarget): Rectangle {
  if (target.kind === "inventory") return profile.inventory;
  const page = profile.pages[target.page];
  if (target.kind === "page") return page.area;
  const slot = page.slots.find((item) => item.id === target.slotId);
  if (!slot) throw new Error("Unknown calibration slot");
  return materializeSlot(page.area, slot.bounds);
}

/** Apply a drag to its initial snapshot, avoiding accumulated rounding and neighbour changes. */
export function applyCalibrationGesture(
  initial: CalibrationProfile,
  target: GeometryTarget,
  handle: GeometryHandle,
  delta: Point,
): CalibrationProfile {
  const result = structuredClone(initial);
  const transform = (rectangle: Rectangle, extent: { width: number; height: number }) =>
    handle === "move"
      ? moveRectangle(rectangle, delta, extent)
      : resizeRectangle(rectangle, handle, delta, extent);
  if (target.kind === "inventory") {
    result.inventory = transform(initial.inventory, initial.display.bounds);
    return result;
  }
  const page = result.pages[target.page];
  if (target.kind === "page") {
    page.area = transform(page.area, initial.display.bounds);
    return result;
  }
  const slot = page.slots.find((item) => item.id === target.slotId);
  if (!slot) throw new Error("Unknown calibration slot");
  const local = materializeSlot({ ...page.area, x: 0, y: 0 }, slot.bounds);
  const changed = transform(local, page.area);
  const x = changed.x / page.area.width;
  const y = changed.y / page.area.height;
  const right = Math.min(1, (changed.x + changed.width) / page.area.width);
  const bottom = Math.min(1, (changed.y + changed.height) / page.area.height);
  slot.bounds = { x, y, width: right - x, height: bottom - y };
  return result;
}

export function setSlotEnabled(
  profile: CalibrationProfile,
  pageId: PageId,
  slotId: string,
  enabled: boolean,
): CalibrationProfile {
  const result = structuredClone(profile);
  const slot = result.pages[pageId].slots.find((item) => item.id === slotId);
  if (!slot) throw new Error("Unknown calibration slot");
  slot.enabled = enabled;
  return result;
}
