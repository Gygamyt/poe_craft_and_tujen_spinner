import { bundledLayout, materializeSlot, type PageId, type Rectangle } from "../../calibration";
import { seededRandom } from "../../input";
import { validatePlacements, projectPlacement, type Placement } from "../../inventory";
export const inventoryGrid = { columns: 12, rows: 5 };
export const footprintPresets = {
  "1x1": { width: 1, height: 1 },
  "1x3": { width: 1, height: 3 },
  "2x3": { width: 2, height: 3 },
  "2x4": { width: 2, height: 4 },
} as const;
export interface FixturePlacement {
  preset: keyof typeof footprintPresets;
  column: number;
  row: number;
  obstacle: boolean;
}

export interface Fixture {
  seed: number;
  epoch: number;
  sequence: number;
  page: PageId;
  selected?: string;
  item: { id: string; version: number; modifiers: string[]; placement: Placement };
  obstacle: boolean;
  balances: Record<string, number>;
  disabled: string[];
}
export interface FixtureTarget {
  id: string;
  label: string;
  kind: "inventory" | "currency";
  bounds: Rectangle;
  enabled: boolean;
  context?: Placement;
}

export function createFixture(seed: number, epoch = 1): Fixture {
  seededRandom(seed);
  const balances: Record<string, number> = {};
  for (const [page, value] of Object.entries(structuredClone(bundledLayout).pages)) {
    for (const slot of value.slots) balances[`${page}/${slot.id}`] = 20;
  }
  return {
    seed,
    epoch,
    sequence: 0,
    page: "general",
    item: {
      id: "inventory-0",
      version: 0,
      modifiers: ["Synthetic item"],
      placement: {
        instanceId: "inventory-0",
        baseId: "synthetic-1x1",
        snapshotId: "fixture-v1",
        revision: 0,
        column: 0,
        row: 0,
        width: 1,
        height: 1,
      },
    },
    obstacle: false,
    balances,
    disabled: [],
  };
}

export function fixturePlacements(state: Fixture): Placement[] {
  return [
    state.item.placement,
    ...(state.obstacle
      ? [
          {
            instanceId: "obstacle",
            baseId: "synthetic-obstacle",
            snapshotId: "fixture-v1",
            revision: 0,
            column: 10,
            row: 3,
            width: 2,
            height: 2,
          },
        ]
      : []),
  ];
}
export function configureFixture(state: Fixture, value: FixturePlacement): Fixture {
  const size = footprintPresets[value.preset];
  if (!size) throw new Error("unknown-footprint-preset");
  const next = structuredClone(state);
  next.item.placement = {
    ...next.item.placement,
    ...size,
    column: value.column,
    row: value.row,
    baseId: `synthetic-${value.preset}`,
    revision: next.item.placement.revision + 1,
  };
  next.obstacle = value.obstacle;
  validatePlacements(inventoryGrid, fixturePlacements(next));
  next.epoch++;
  return next;
}
export function fixtureInventoryArea(viewport: { width: number; height: number }): Rectangle {
  const width = viewport.width * 0.46;
  return { x: viewport.width * 0.51, y: 250, width, height: (width * 5) / 12 };
}

export function fixtureTargets(
  state: Fixture,
  viewport: { width: number; height: number },
): FixtureTarget[] {
  const size = Math.min(viewport.width * 0.43, viewport.height - 260);
  const stash = { x: 15, y: 230, width: size, height: size };
  return [
    ...bundledLayout.pages[state.page].slots.map((slot) => {
      const id = `${state.page}/${slot.id}`;
      return {
        id,
        label: slot.defaultLabel ?? slot.id,
        kind: "currency" as const,
        bounds: materializeSlot(stash, slot.bounds),
        enabled: !state.disabled.includes(id),
      };
    }),
    ...fixturePlacements(state).map((placement) => ({
      id: placement.instanceId,
      label:
        placement.instanceId === "obstacle"
          ? "Obstacle"
          : `Synthetic ${placement.width}×${placement.height}`,
      kind: "inventory" as const,
      bounds: projectPlacement(
        inventoryGrid,
        fixturePlacements(state),
        placement.instanceId,
        fixtureInventoryArea(viewport),
      ),
      enabled: placement.instanceId !== "obstacle",
      context: structuredClone(placement),
    })),
  ];
}

export function applyFixtureAction(
  state: Fixture,
  targetId: string,
  button: "primary" | "secondary",
  shift: boolean,
) {
  if (state.disabled.includes(targetId)) throw new Error("disabled-slot");
  validatePlacements(inventoryGrid, fixturePlacements(state));
  if (targetId in state.balances) {
    if (!targetId.startsWith(`${state.page}/`) || button !== "secondary")
      throw new Error("inactive-or-invalid-currency");
    state.selected = targetId;
  } else {
    if (targetId !== state.item.id || button !== "primary") throw new Error("missing-item");
    if (!shift) {
      if (!state.selected || state.balances[state.selected] <= 0) throw new Error("no-currency");
      state.balances[state.selected]--;
      state.item.version++;
      const random = seededRandom((state.seed + state.item.version) >>> 0);
      state.item.modifiers = [`Synthetic modifier ${1 + Math.floor(random() * 1000)}`];
    }
  }
  state.sequence++;
  return {
    epoch: state.epoch,
    sequence: state.sequence,
    item: structuredClone(state.item),
    selected: state.selected,
  };
}
