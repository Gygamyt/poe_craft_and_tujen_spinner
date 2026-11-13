import type { Grid, Placement, ItemContext } from "../contracts";
import type { Point, Rectangle } from "../../calibration";
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
const nonnegative = (n: number) => Number.isSafeInteger(n) && n >= 0;
export function validatePlacements(grid: Grid, items: readonly Placement[]): void {
  if (!positive(grid.columns) || !positive(grid.rows)) throw new Error("invalid-grid");
  const ids = new Set<string>();
  for (const item of items) {
    if (
      ![item.instanceId, item.baseId, item.snapshotId].every(
        (id) => typeof id === "string" && id.length > 0 && id.length <= 300,
      ) ||
      !nonnegative(item.revision)
    )
      throw new Error("invalid-item-context");
    if (ids.has(item.instanceId)) throw new Error("duplicate-instance");
    ids.add(item.instanceId);
    if (!positive(item.width) || !positive(item.height))
      throw new Error("unknown-or-invalid-footprint");
    if (
      !nonnegative(item.column) ||
      !nonnegative(item.row) ||
      item.width > grid.columns - item.column ||
      item.height > grid.rows - item.row
    )
      throw new Error("placement-out-of-bounds");
  }
  for (let a = 0; a < items.length; a++)
    for (let b = a + 1; b < items.length; b++) {
      const x = items[a],
        y = items[b];
      if (
        x.column < y.column + y.width &&
        y.column < x.column + x.width &&
        x.row < y.row + y.height &&
        y.row < x.row + x.height
      )
        throw new Error("placement-overlap");
    }
}
export function itemAtCell(
  grid: Grid,
  items: readonly Placement[],
  column: number,
  row: number,
): Placement | undefined {
  validatePlacements(grid, items);
  if (!nonnegative(column) || !nonnegative(row) || column >= grid.columns || row >= grid.rows)
    return;
  return items.find(
    (item) =>
      column >= item.column &&
      column < item.column + item.width &&
      row >= item.row &&
      row < item.row + item.height,
  );
}
function validateArea(area: Rectangle) {
  if (
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.width <= 0 ||
    area.height <= 0
  )
    throw new Error("invalid-inventory-area");
}
export function projectPlacement(
  grid: Grid,
  items: readonly Placement[],
  instanceId: string,
  area: Rectangle,
): Rectangle {
  validatePlacements(grid, items);
  validateArea(area);
  const item = items.find((item) => item.instanceId === instanceId);
  if (!item) throw new Error("missing-item");
  return {
    x: area.x + (item.column * area.width) / grid.columns,
    y: area.y + (item.row * area.height) / grid.rows,
    width: (item.width * area.width) / grid.columns,
    height: (item.height * area.height) / grid.rows,
  };
}
export function itemAtPoint(
  grid: Grid,
  items: readonly Placement[],
  area: Rectangle,
  point: Point,
): Placement | undefined {
  validatePlacements(grid, items);
  validateArea(area);
  if (
    ![point.x, point.y].every(Number.isFinite) ||
    point.x < area.x ||
    point.y < area.y ||
    point.x >= area.x + area.width ||
    point.y >= area.y + area.height
  )
    return;
  return itemAtCell(
    grid,
    items,
    Math.floor((point.x - area.x) / (area.width / grid.columns)),
    Math.floor((point.y - area.y) / (area.height / grid.rows)),
  );
}
export function assertItemContext(expected: ItemContext, actual: ItemContext): void {
  if (
    expected.instanceId !== actual.instanceId ||
    expected.baseId !== actual.baseId ||
    expected.snapshotId !== actual.snapshotId ||
    expected.revision !== actual.revision
  )
    throw new Error("stale-item-placement");
}
