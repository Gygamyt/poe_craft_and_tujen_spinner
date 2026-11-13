import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TestbedSession } from "../../src/features/testbed";
import type { InputDriver } from "../../src/features/input";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function fixture() {
  let now = 0,
    shift = false,
    buttonHeld = false;
  const events: string[] = [];
  const hooks = { sleep: () => {}, untrusted: false };
  const driver: InputDriver = {
    assertTarget: () => {},
    held: () => false,
    move: () => {
      events.push("move");
      return 1;
    },
    button: (button, down) => {
      buttonHeld = down;
      events.push(down ? "down" : "up");
      if (!down) {
        const state = session.snapshot();
        const planned = [...state.trace].reverse().find((entry) => entry.phase === "planned")!
          .data as { targetId: string };
        const target = state.targets.find((item) => item.id === planned.targetId)!;
        session.receive({
          type: "pointerup",
          x: target.bounds.x + target.bounds.width / 2,
          y: target.bounds.y + target.bounds.height / 2,
          button: button === "primary" ? 0 : 2,
          shift,
          key: "",
          trusted: !hooks.untrusted,
          runId: state.activeRun,
          epoch: state.fixture.epoch,
        });
      }
      return 1;
    },
    shift: (down) => {
      shift = down;
      return 1;
    },
    now: () => now,
    sleep: async (ms, signal) => {
      now += ms;
      hooks.sleep();
      if (signal.aborted) throw new Error("aborted");
    },
  };
  const session = new TestbedSession({
    driver,
    viewport: () => ({ width: 1080, height: 760 }),
    capture: () => ({ token: "fixture", cursor: { x: 30, y: 30 } }),
    now: () => now,
    later: (ms, callback) => {
      const timer = setTimeout(callback, ms);
      return () => clearTimeout(timer);
    },
    publish: () => {},
  });
  const run = (
    targetId = "general/slot-001",
    button: "primary" | "secondary" = "secondary",
    shift = false,
  ) => session.run({ targetId, button, shift, seed: 1 });
  return { session, run, events, hooks, held: () => buttonHeld || shift };
}
it("confirms one fresh action and changes the synthetic item once", async () => {
  const f = fixture();
  expect((await f.run()).status).toBe("confirmed");
  expect((await f.run("inventory-0", "primary")).status).toBe("confirmed");
  expect(f.session.snapshot().fixture.item.version).toBe(1);
  expect(f.session.snapshot().fixture.balances["general/slot-001"]).toBe(19);
  expect(f.held()).toBe(false);
});
it("confirms one item action away from the anchor of a multi-cell rectangle", async () => {
  const f = fixture();
  f.session.configure({ preset: "2x3", column: 4, row: 1, obstacle: true });
  await f.run();
  await f.run("inventory-0", "primary");
  const state = f.session.snapshot();
  expect(state.fixture.item.version).toBe(1);
  expect(state.fixture.balances["general/slot-001"]).toBe(19);
  expect(state.trace.filter((entry) => entry.phase === "observation").at(-1)?.data).toMatchObject({
    item: { placement: { width: 2, height: 3, revision: 1 } },
  });
});
it("cancels during motion on placement change without spending or delivering button down", async () => {
  const f = fixture();
  await f.run();
  const before = f.session.snapshot();
  f.events.length = 0;
  let changed = false;
  f.hooks.sleep = () => {
    if (!changed) {
      changed = true;
      f.session.configure({ preset: "2x3", column: 4, row: 1, obstacle: false });
    }
  };
  expect((await f.run("inventory-0", "primary")).status).toMatch(/stopped|failed/);
  expect(f.events).not.toContain("down");
  expect(f.held()).toBe(false);
  expect(f.session.snapshot().fixture.balances).toEqual(before.fixture.balances);
  expect(f.session.snapshot().fixture.epoch).toBe(before.fixture.epoch + 1);
});
it("ignores old delivered observations after placement changes and keeps invalid edits atomic", async () => {
  const f = fixture();
  await f.run();
  f.session.setFault("delayed");
  const pending = f.run("inventory-0", "primary");
  await vi.advanceTimersByTimeAsync(1);
  const previous = f.session.snapshot();
  expect(() =>
    f.session.configure({ preset: "2x4", column: 11, row: 0, obstacle: false }),
  ).toThrow();
  expect(f.session.snapshot().fixture).toEqual(previous.fixture);
  f.session.configure({ preset: "2x3", column: 4, row: 1, obstacle: false });
  await vi.advanceTimersByTimeAsync(2000);
  expect((await pending).status).toBe("placement-changed");
  expect(f.session.snapshot().fixture.item.version).toBe(1);
  expect(f.session.snapshot().fixture.balances["general/slot-001"]).toBe(19);
});
it("releases held button and Shift after reconfiguration without confirming its cleanup event", async () => {
  const f = fixture();
  await f.run();
  let changed = false;
  f.hooks.sleep = () => {
    if (!changed && f.events.at(-1) === "down") {
      changed = true;
      f.session.configure({ preset: "2x3", column: 0, row: 0, obstacle: false });
    }
  };
  expect((await f.run("inventory-0", "primary", true)).status).toMatch(/stopped|failed/);
  expect(changed).toBe(true);
  expect(f.held()).toBe(false);
  expect(f.session.snapshot().fixture.item.version).toBe(0);
  expect(f.session.snapshot().fixture.balances["general/slot-001"]).toBe(20);
});
it.each(["missing", "delayed"] as const)(
  "does not retry an unconfirmed %s observation",
  async (fault) => {
    const f = fixture();
    await f.run();
    f.session.setFault(fault);
    const pending = f.run("inventory-0", "primary");
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).status).toBe("unconfirmed-timeout");
    expect(f.events.filter((event) => event === "down")).toHaveLength(2);
    expect(f.session.snapshot().fixture.item.version).toBe(1);
  },
);
it("ignores stale events after reset and cannot confirm from untrusted input", async () => {
  const f = fixture();
  await f.run();
  const old = f.session.snapshot();
  f.session.reset(1);
  f.session.receive({
    type: "pointerup",
    x: 800,
    y: 240,
    button: 0,
    shift: false,
    key: "",
    trusted: true,
    runId: old.activeRun,
    epoch: old.fixture.epoch,
  });
  expect(f.session.snapshot().fixture.item.version).toBe(0);
  f.hooks.untrusted = true;
  const pending = f.run();
  await vi.advanceTimersByTimeAsync(1000);
  expect((await pending).status).toBe("unconfirmed-timeout");
});
it("locks the session while awaiting confirmation even after delivery has ended", async () => {
  const f = fixture();
  f.session.setFault("missing");
  const pending = f.run();
  await vi.advanceTimersByTimeAsync(1);
  await expect(f.run()).rejects.toThrow("busy");
  f.session.stop();
  expect((await pending).status).toBe("stopped");
});
it.each(["reset", "dispose"])(
  "cancels held input on %s and releases Shift and the button",
  async (action) => {
    const f = fixture();
    f.hooks.sleep = () => {
      if (f.events.includes("down")) {
        if (action === "reset") f.session.reset(2);
        else f.session.dispose();
      }
    };
    const result = await f.run("inventory-0", "primary", true);
    expect(result.status).toContain("stopped");
    expect(f.held()).toBe(false);
    expect(f.session.snapshot().fixture.item.version).toBe(0);
  },
);
it("bounds trace buffers and returns isolated snapshots", () => {
  const f = fixture();
  for (let index = 0; index < 600; index++) f.session.record("fixture", { index });
  const state = f.session.snapshot();
  expect(state.trace).toHaveLength(500);
  expect(state.trace[0].data).toEqual({ index: 100 });
  state.fixture.item.version = 999;
  expect(f.session.snapshot().fixture.item.version).toBe(0);
});
it("rejects disabled and inactive targets before native delivery", async () => {
  const f = fixture();
  f.session.toggle("general/slot-001", false);
  await expect(f.run()).rejects.toThrow("disabled");
  await expect(f.run("atlas/slot-001")).rejects.toThrow("inactive");
  expect(f.events).toEqual([]);
});
