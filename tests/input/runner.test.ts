import { expect, it } from "vitest";
import { InputRunner, planMotion, type InputDriver } from "../../src/features/input";

const execution = {
  plan: planMotion({
    seed: 1,
    start: { x: 0, y: 0 },
    target: { x: 100, y: 100, width: 30, height: 30 },
    viewport: { width: 500, height: 500 },
    enabled: true,
  }),
  token: "fixture",
  button: "primary" as const,
  shift: true,
};
function fixture() {
  const events: string[] = [];
  let now = 0;
  const state = { held: false, lost: false, inserted: 1, sleepHook: () => {} };
  const driver: InputDriver = {
    assertTarget: () => {
      if (state.lost) throw new Error("focus-lost");
    },
    held: () => state.held,
    move: () => {
      events.push("move");
      return state.inserted;
    },
    button: (_, down) => {
      events.push(down ? "down" : "up");
      return state.inserted;
    },
    shift: (down) => {
      events.push(down ? "shift-down" : "shift-up");
      return state.inserted;
    },
    now: () => now,
    sleep: async (ms, signal) => {
      now += ms;
      state.sleepHook();
      if (signal.aborted) throw new Error("aborted");
    },
  };
  const runner = new InputRunner(driver);
  return { events, state, driver, runner };
}
it("serializes moves, Shift and a single click without claiming an item observation", async () => {
  const f = fixture();
  expect(await f.runner.run(execution)).toEqual({ status: "delivered" });
  expect(f.events.slice(-4)).toEqual(["shift-down", "down", "up", "shift-up"]);
  expect(f.events.filter((event) => event === "down")).toHaveLength(1);
  expect(f.runner.busy).toBe(false);
});
it("rejects held physical input without releasing it", async () => {
  const f = fixture();
  f.state.held = true;
  expect(await f.runner.run(execution)).toEqual({
    status: "rejected",
    reason: "physical-input-held",
  });
  expect(f.events).toEqual([]);
  expect(f.runner.busy).toBe(false);
});
it("cancels between movement events", async () => {
  const f = fixture();
  f.state.sleepHook = () => f.runner.cancel();
  expect((await f.runner.run(execution)).status).toBe("stopped");
  expect(f.events).toEqual([]);
});
it.each(["cancel", "focus-loss"])(
  "releases only owned buttons/modifiers after %s",
  async (reason) => {
    const f = fixture();
    f.state.sleepHook = () => {
      if (f.events.includes("down")) {
        if (reason === "cancel") f.runner.cancel();
        else f.state.lost = true;
      }
    };
    const result = await f.runner.run(execution);
    expect(result.status).toBe(reason === "cancel" ? "stopped" : "failed");
    expect(f.events.slice(-4)).toEqual(["shift-down", "down", "up", "shift-up"]);
  },
);
it("fails zero delivery without retrying", async () => {
  const f = fixture();
  f.state.inserted = 0;
  expect(await f.runner.run(execution)).toEqual({ status: "failed", reason: "partial-delivery" });
  expect(f.events).toEqual(["move"]);
});
it("reports cleanup failure instead of hiding a possibly held input", async () => {
  const f = fixture();
  f.state.sleepHook = () => {
    if (f.events.includes("down")) {
      f.state.inserted = 0;
      f.runner.cancel();
    }
  };
  expect(await f.runner.run(execution)).toEqual({
    status: "failed",
    reason: "cleanup-failed",
    cleanupFailed: true,
  });
  expect(f.events.slice(-2)).toEqual(["up", "shift-up"]);
});
it("rejects a concurrent run without disturbing the owner", async () => {
  const f = fixture();
  let resume = () => {};
  f.driver.sleep = () =>
    new Promise<void>((resolve) => {
      resume = resolve;
    });
  const active = f.runner.run(execution);
  expect(await f.runner.run(execution)).toEqual({ status: "rejected", reason: "busy" });
  f.runner.cancel();
  resume();
  expect((await active).status).toBe("stopped");
  expect(f.runner.busy).toBe(false);
});
