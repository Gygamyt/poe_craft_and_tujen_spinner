import { expect, it } from "vitest";
import { createFixture, fixtureTargets, applyFixtureAction } from "../../src/features/testbed";
import { testbedCommandSchema } from "../../src/features/testbed";

it("has 60 inventory cells and three independent reference stash pages", () => {
  const state = createFixture(1);
  for (const [page, count] of [
    ["general", 60],
    ["atlas", 58],
    ["league", 39],
  ] as const) {
    state.page = page;
    const targets = fixtureTargets(state, { width: 1080, height: 760 });
    expect(targets.filter((target) => target.kind === "inventory")).toHaveLength(60);
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
