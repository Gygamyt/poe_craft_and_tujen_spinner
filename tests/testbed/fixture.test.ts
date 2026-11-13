import { expect, it } from "vitest";
import { createFixture, fixtureTargets, applyFixtureAction } from "../../src/features/testbed";
import { testbedCommandSchema } from "../../src/features/testbed";
import {
  configureFixture,
  fixturePlacements,
  fixtureInventoryArea,
} from "../../src/features/testbed";
import { itemAtPoint } from "../../src/features/inventory";
it.each(["1x1", "1x3", "2x3", "2x4"] as const)(
  "maps %s as one target without changing named currency regions",
  (preset) => {
    const initial = createFixture(7);
    const viewport = { width: 1080, height: 760 };
    for (const page of ["general", "atlas", "league"] as const) {
      initial.page = page;
      const state = configureFixture(initial, { preset, column: 4, row: 1, obstacle: true });
      const targets = fixtureTargets(state, viewport);
      expect(targets.filter((t) => t.kind === "currency")).toEqual(
        fixtureTargets(initial, viewport).filter((t) => t.kind === "currency"),
      );
      const target = targets.find((t) => t.id === state.item.id)!;
      const lastCellPoint = {
        x: target.bounds.x + target.bounds.width - 1,
        y: target.bounds.y + target.bounds.height - 1,
      };
      expect(
        itemAtPoint(
          { columns: 12, rows: 5 },
          fixturePlacements(state),
          fixtureInventoryArea(viewport),
          lastCellPoint,
        )?.instanceId,
      ).toBe(state.item.id);
      const currency = targets.find((t) => t.kind === "currency")!;
      applyFixtureAction(state, currency.id, "secondary", false);
      applyFixtureAction(state, state.item.id, "primary", false);
      expect(state.item.version).toBe(1);
      expect(state.balances[currency.id]).toBe(19);
    }
  },
);
it("rejects invalid edits without replacing prior state or accepting screen coordinates", () => {
  const state = createFixture(1),
    before = structuredClone(state);
  for (const value of [
    { preset: "2x4" as const, column: 11, row: 0, obstacle: false },
    { preset: "2x3" as const, column: 10, row: 2, obstacle: true },
  ])
    expect(() => configureFixture(state, value)).toThrow();
  expect(state).toEqual(before);
  expect(
    testbedCommandSchema.safeParse({
      kind: "placement",
      preset: "2x3",
      column: 0,
      row: 0,
      obstacle: false,
      x: 200,
    }).success,
  ).toBe(false);
});

it("has one inventory item target and three independent reference stash pages", () => {
  const state = createFixture(1);
  for (const [page, count] of [
    ["general", 60],
    ["atlas", 58],
    ["league", 39],
  ] as const) {
    state.page = page;
    const targets = fixtureTargets(state, { width: 1080, height: 760 });
    expect(targets.filter((target) => target.kind === "inventory")).toHaveLength(1);
    expect(targets.filter((target) => target.kind === "currency")).toHaveLength(count);
    expect(new Set(targets.map((target) => target.id)).size).toBe(targets.length);
  }
});
it("replays synthetic mutations, spends exactly once and preserves other fixtures", () => {
  const replay = () => {
    const state = createFixture(19);
    applyFixtureAction(state, "general/slot-001", "secondary", false);
    for (let index = 0; index < 20; index++)
      applyFixtureAction(state, "inventory-0", "primary", false);
    expect(state.balances["general/slot-001"]).toBe(0);
    expect(() => applyFixtureAction(state, "inventory-0", "primary", false)).toThrow("no-currency");
    expect(state.item.version).toBe(20);
    return state;
  };
  expect(replay()).toEqual(replay());
  expect(createFixture(19).balances["general/slot-001"]).toBe(20);
});
it("rejects disabled or hidden slots and missing inventory items", () => {
  const state = createFixture(1);
  state.disabled = ["general/slot-001"];
  expect(() => applyFixtureAction(state, "general/slot-001", "secondary", false)).toThrow(
    "disabled",
  );
  expect(() => applyFixtureAction(state, "atlas/slot-001", "secondary", false)).toThrow("inactive");
  expect(() => applyFixtureAction(state, "inventory-1", "primary", false)).toThrow("missing-item");
  applyFixtureAction(state, "inventory-0", "primary", true);
  expect(state.item.version).toBe(0);
});
it.each([
  { kind: "run", targetId: "inventory-0", button: "primary", shift: false, seed: 1, hwnd: 123 },
  {
    kind: "run",
    targetId: "inventory-0",
    button: "primary",
    shift: false,
    seed: 1,
    x: 100,
    y: 100,
  },
  { kind: "reset", seed: -1 },
  { kind: "export", filePath: "arbitrary.json" },
])("rejects renderer handles, coordinates, paths and invalid seeds", (value) => {
  expect(testbedCommandSchema.safeParse(value).success).toBe(false);
});
