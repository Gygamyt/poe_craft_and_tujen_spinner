import { bundledLayout, materializeSlot, type PageId, type Rectangle } from "../../calibration";
import { seededRandom } from "../../input";

export interface Fixture {
  seed: number;
  epoch: number;
  sequence: number;
  page: PageId;
  selected?: string;
  item: { id: string; version: number; modifiers: string[] };
  balances: Record<string, number>;
  disabled: string[];
}
export interface FixtureTarget {
  id: string;
  label: string;
  kind: "inventory" | "currency";
  bounds: Rectangle;
  enabled: boolean;
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
    item: { id: "inventory-0", version: 0, modifiers: ["Synthetic item"] },
    balances,
    disabled: [],
  };
}

export function fixtureTargets(
  state: Fixture,
  viewport: { width: number; height: number },
): FixtureTarget[] {
  const size = Math.min(viewport.width * 0.43, viewport.height - 220);
  const stash = { x: 15, y: 175, width: size, height: size };
  const inventoryWidth = viewport.width * 0.46;
  const cell = inventoryWidth / 12;
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
    ...Array.from({ length: 60 }, (_, index) => ({
      id: `inventory-${index}`,
      label: index === 0 ? "Item" : `${index + 1}`,
      kind: "inventory" as const,
      bounds: {
        x: viewport.width * 0.51 + (index % 12) * cell,
        y: 220 + Math.floor(index / 12) * cell,
        width: cell - 2,
        height: cell - 2,
      },
      enabled: true,
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
