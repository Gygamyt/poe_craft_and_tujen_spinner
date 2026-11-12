import type { DisplaySnapshot } from "../../../features/calibration";

export function previewControlBounds(display: DisplaySnapshot): Electron.Rectangle {
  const bounds = display.bounds;
  const width = Math.min(280, bounds.width);
  const height = Math.min(68, bounds.height);
  return {
    x: Math.max(
      bounds.x,
      Math.min(bounds.x + bounds.width - width, Math.round(bounds.x + (bounds.width - width) / 2)),
    ),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, bounds.y + 12)),
    width,
    height,
  };
}
