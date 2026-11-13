import type { Rectangle } from "../../calibration";

/** Viewport coordinates shared by rendering and native target resolution. */
export function testbedLayout(viewport: { width: number; height: number }) {
  const sidebar = 320;
  const gap = 20;
  const columnWidth = Math.max(1, (viewport.width - sidebar - gap * 3) / 2);
  const stashSize = Math.max(1, Math.min(columnWidth, viewport.height - 80));
  const inventoryWidth = Math.max(1, Math.min(columnWidth, ((viewport.height - 240) * 12) / 5));
  const inventory: Rectangle = {
    x: sidebar + gap * 2 + columnWidth,
    y: 60,
    width: inventoryWidth,
    height: (inventoryWidth * 5) / 12,
  };
  return {
    sidebar,
    stash: { x: sidebar + gap, y: 60, width: stashSize, height: stashSize },
    inventory,
    details: {
      x: inventory.x,
      y: inventory.y + inventory.height + gap,
      width: columnWidth,
      height: Math.max(1, viewport.height - inventory.y - inventory.height - gap * 2),
    },
  };
}
