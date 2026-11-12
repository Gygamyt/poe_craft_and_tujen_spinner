import { rectangleSchema } from "./calibration";
import {
  displaySnapshotSchema,
  normalizedRectangleSchema,
  pageIds,
  parseCalibrationProfile,
  type CalibrationProfile,
  type DisplaySnapshot,
  type LayoutTemplate,
  type Rectangle,
} from "./calibration-layout";

export interface Point {
  x: number;
  y: number;
}
export type ResizeCorner = "nw" | "ne" | "sw" | "se";
type Extent = { width: number; height: number };

export function materializeSlot(area: Rectangle, relative: Rectangle): Rectangle {
  rectangleSchema.parse(area);
  normalizedRectangleSchema.parse(relative);
  return {
    x: area.x + relative.x * area.width,
    y: area.y + relative.y * area.height,
    width: relative.width * area.width,
    height: relative.height * area.height,
  };
}

export function inventoryCells(area: Rectangle): Rectangle[] {
  rectangleSchema.parse(area);
  return Array.from({ length: 60 }, (_, index) => ({
    x: area.x + (index % 12) * (area.width / 12),
    y: area.y + Math.floor(index / 12) * (area.height / 5),
    width: area.width / 12,
    height: area.height / 5,
  }));
}

function validateGesture(area: Rectangle, delta: Point, extent: Extent): void {
  rectangleSchema.parse(area);
  if (
    ![delta.x, delta.y, extent.width, extent.height].every(Number.isFinite) ||
    area.x + area.width > extent.width ||
    area.y + area.height > extent.height
  ) {
    throw new Error("Gesture requires finite coordinates and an area inside its bounds");
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function moveRectangle(area: Rectangle, delta: Point, extent: Extent): Rectangle {
  validateGesture(area, delta, extent);
  return {
    ...area,
    x: clamp(area.x + delta.x, 0, extent.width - area.width),
    y: clamp(area.y + delta.y, 0, extent.height - area.height),
  };
}

export function resizeRectangle(
  area: Rectangle,
  corner: ResizeCorner,
  delta: Point,
  extent: Extent,
): Rectangle {
  validateGesture(area, delta, extent);
  const right = area.x + area.width;
  const bottom = area.y + area.height;
  const minWidth = Math.min(1, area.width);
  const minHeight = Math.min(1, area.height);
  const x = corner.endsWith("w") ? clamp(area.x + delta.x, 0, right - minWidth) : area.x;
  const y = corner.startsWith("n") ? clamp(area.y + delta.y, 0, bottom - minHeight) : area.y;
  const newRight = corner.endsWith("e")
    ? clamp(right + delta.x, x + minWidth, extent.width)
    : right;
  const newBottom = corner.startsWith("s")
    ? clamp(bottom + delta.y, y + minHeight, extent.height)
    : bottom;
  return { x, y, width: newRight - x, height: newBottom - y };
}

/** Electron screen coordinates already use DIP; scaleFactor is deliberately not applied here. */
export function localToDesktop(display: DisplaySnapshot, point: Point): Point {
  displaySnapshotSchema.parse(display);
  if (![point.x, point.y].every(Number.isFinite)) throw new Error("Point must be finite");
  return { x: display.bounds.x + point.x, y: display.bounds.y + point.y };
}

export function createCalibrationProfile(
  template: LayoutTemplate,
  display: DisplaySnapshot,
): CalibrationProfile {
  displaySnapshotSchema.parse(display);
  const { width, height } = display.bounds;
  const stashSize = Math.min(width * 0.45, height * 0.8);
  const inventoryWidth = Math.min(width * 0.42, height * 0.84);
  const inventoryHeight = (inventoryWidth * 5) / 12;
  const pages = Object.fromEntries(
    pageIds.map((id) => [
      id,
      {
        area: { x: width * 0.02, y: height * 0.08, width: stashSize, height: stashSize },
        slots: template.pages[id].slots.map((slot) => ({
          id: slot.id,
          bounds: { ...slot.bounds },
          enabled: true,
        })),
      },
    ]),
  );
  return parseCalibrationProfile(template, {
    schemaVersion: 1,
    layoutId: template.layoutId,
    geometryVersion: template.geometryVersion,
    display: structuredClone(display),
    inventory: {
      x: width * 0.98 - inventoryWidth,
      y: height * 0.95 - inventoryHeight,
      width: inventoryWidth,
      height: inventoryHeight,
    },
    pages,
  });
}
