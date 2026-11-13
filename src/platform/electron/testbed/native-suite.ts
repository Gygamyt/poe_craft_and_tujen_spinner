import type { BrowserWindow } from "electron";
import { setTimeout as delay } from "node:timers/promises";
import type { TestbedSession } from "../../../features/testbed";
import type { Win32Input } from "../../windows/input/win32";
import { planMotion } from "../../../features/input";

/** Explicit opt-in only: each next action waits for observed confirmation. */
export async function runNativeSuite(
  session: TestbedSession,
  window: BrowserWindow,
  main: BrowserWindow,
  native: Win32Input,
  setHook: (hook?: (data: unknown) => void) => void,
) {
  if (session.snapshot().busy) throw new Error("busy");
  const checks: { name: string; ok: boolean; detail?: unknown }[] = [];
  const check = (name: string, ok: boolean, detail?: unknown) => {
    checks.push({ name, ok, detail });
    if (!ok) throw new Error(`Native check failed: ${name}`);
  };
  const focus = async () => {
    window.show();
    window.focus();
    await delay(250);
  };
  const run = (
    targetId: string,
    button: "primary" | "secondary",
    shift = false,
    seed = 1,
    hold = 80,
  ) => session.run({ targetId, button, shift, seed }, { holdMin: hold, holdMax: hold });
  try {
    if (window.isFullScreen()) window.setFullScreen(false);
    if (window.isMaximized()) window.unmaximize();
    session.reset(1);
    session.setFault("none");
    await focus();
    for (const page of ["general", "atlas", "league"] as const) {
      session.page(page);
      const currency = session.snapshot().targets.find((item) => item.kind === "currency")!;
      check(`${page}-secondary`, (await run(currency.id, "secondary")).status === "confirmed");
      check(
        `${page}-primary`,
        (await run("inventory-0", "primary", false, 2)).status === "confirmed",
      );
    }
    session.configure({ preset: "2x3", column: 4, row: 1, obstacle: true });
    const large = session.snapshot();
    const itemTarget = large.targets.find((target) => target.id === large.fixture.item.id)!;
    let largeSeed = 1;
    while (largeSeed < 1000) {
      const plan = planMotion({
        seed: largeSeed,
        start: { x: 0, y: 0 },
        target: itemTarget.bounds,
        viewport: large.viewport,
        enabled: true,
      });
      if (plan.click.y > itemTarget.bounds.y + itemTarget.bounds.height / 3 + 4) break;
      largeSeed++;
    }
    const selectedCurrency = large.fixture.selected!;
    check(
      "multi-cell-native-action",
      (await run(large.fixture.item.id, "primary", false, largeSeed)).status === "confirmed",
    );
    const afterLarge = session.snapshot();
    const received = afterLarge.trace
      .filter(
        (entry) =>
          entry.phase === "received" && (entry.data as { type: string }).type === "pointerup",
      )
      .at(-1)?.data as { x: number; y: number };
    check(
      "multi-cell-non-anchor-event",
      received.y >= itemTarget.bounds.y + itemTarget.bounds.height / 3 &&
        received.x >= itemTarget.bounds.x &&
        received.x < itemTarget.bounds.x + itemTarget.bounds.width,
      received,
    );
    check(
      "multi-cell-single-consumption",
      afterLarge.fixture.item.version === large.fixture.item.version + 1 &&
        afterLarge.fixture.balances[selectedCurrency] ===
          large.fixture.balances[selectedCurrency] - 1,
    );
    let placementChanged = false;
    setHook((data) => {
      if (!placementChanged && (data as { kind: string }).kind === "move") {
        placementChanged = true;
        session.configure({ preset: "2x4", column: 6, row: 0, obstacle: false });
      }
    });
    const stalePlacement = await run("inventory-0", "primary");
    setHook();
    check(
      "stale-placement-stops-input",
      stalePlacement.status.startsWith("stopped") || stalePlacement.status.startsWith("failed"),
      stalePlacement,
    );
    check(
      "stale-placement-no-consumption",
      session.snapshot().fixture.balances[selectedCurrency] ===
        afterLarge.fixture.balances[selectedCurrency] && !native.held(1),
    );
    session.configure({ preset: "1x1", column: 0, row: 0, obstacle: false });
    check("shift-observed", (await run("inventory-0", "primary", true, 3)).status === "confirmed");
    check("shift-released", !native.held(0x10));
    const clicks = session
      .snapshot()
      .trace.filter((entry) => entry.phase === "planned")
      .map((entry) => (entry.data as { plan: { click: { x: number; y: number } } }).plan.click);
    check(
      "varied-planned-clicks",
      new Set(clicks.map((point) => `${point.x},${point.y}`)).size > 1,
    );
    session.setFault("delayed");
    check(
      "observation-timeout",
      (await run("inventory-0", "primary")).status === "unconfirmed-timeout",
    );
    session.reset(2);
    session.setFault("none");
    const currency = session.snapshot().targets.find((item) => item.kind === "currency")!;
    check(
      "stale-observation-does-not-confirm-new-run",
      (await run(currency.id, "secondary")).status === "confirmed",
    );
    let injected = false;
    setHook((data) => {
      const event = data as { kind: string; down?: boolean };
      if (!injected && event.kind === "button" && event.down) {
        injected = true;
        setTimeout(() => {
          if (main.isMinimized()) main.restore();
          main.show();
          window.blur();
          main.focus();
        }, 40);
      }
    });
    const lost = await run("inventory-0", "primary", true, 4, 200);
    setHook();
    check(
      "focus-loss-stops-run",
      lost.status.startsWith("stopped") || lost.status.startsWith("failed"),
      lost,
    );
    check("focus-loss-releases-owned-input", !native.held(1) && !native.held(0x10));
    await focus();
    injected = false;
    setHook((data) => {
      if (!injected && (data as { kind: string }).kind === "move") {
        injected = true;
        setTimeout(() => {
          const [width, height] = window.getSize();
          window.setSize(width + 10, height);
        }, 40);
      }
    });
    const moved = await run("inventory-0", "primary", true, 5, 200);
    setHook();
    check(
      "geometry-change-stops-run",
      moved.status.startsWith("stopped") || moved.status.startsWith("failed"),
      moved,
    );
    await focus();
    injected = false;
    setHook((data) => {
      const event = data as { kind: string; down?: boolean };
      if (!injected && event.kind === "button" && event.down) {
        injected = true;
        setTimeout(() => window.close(), 40);
      }
    });
    const closed = await run("inventory-0", "primary", true, 6, 200);
    setHook();
    check(
      "closing-target-stops-run",
      closed.status.startsWith("stopped") || closed.status.startsWith("failed"),
      closed,
    );
    check("closing-target-releases-owned-input", !native.held(1) && !native.held(0x10));
  } catch (error) {
    checks.push({
      name: "suite-error",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    setHook();
    console.info(
      "INPUT_NATIVE_SUITE",
      JSON.stringify({
        ok: checks.every((item) => item.ok),
        mode: process.env.ELECTRON_RENDERER_URL ? "dev" : "build",
        electron: process.versions.electron,
        node: process.versions.node,
        checks,
        received: session.snapshot().trace.filter((entry) => entry.phase === "received").length,
      }),
    );
    session.publish();
  }
}
