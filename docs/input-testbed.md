# Input testbed

The native compatibility probe and the complete opt-in harness have passed in dev and build/start. The testbed does not execute input into PoE or load/save calibration profiles.

## Interactive testbed

Open **Стенд ввода** from the normal control panel. The independent local window contains a 12x5 inventory, General/Atlas/League stash pages, a single synthetic item, and 20 units per synthetic currency slot. Neutral reference slot IDs are retained; these are not verified real currency names or crafting outcomes.

Choose a slot, then **Выбрать валюту · ПКМ**. **Применить · ЛКМ** applies exactly one fixture unit to inventory item 0. **Shift + ЛКМ** exercises modifier delivery without spending. Movement is seeded, curved, and deliberately visible. Keep the cursor inside the testbed client area before starting. Disabled or inactive-page targets are rejected.

**Стоп / Escape**, loss of focus, bounds/display changes, reset, or closing the window stop pending input. Owned Shift/buttons are released. Closing the control panel also closes its testbed. Keep the windows open while manually examining outcomes; close them after finishing a manual session.

Fault modes delay or omit fresh observation confirmation. A missing/delayed confirmation returns `unconfirmed-timeout`, without retrying. The fixture may already have changed: inspect its version and balance before explicitly requesting another action. Reset changes the fixture epoch; stale events cannot confirm a newer run. Traces include run/epoch, planned geometry/timing, native insertion counts, actual pointer/key events, observations and results, bounded to 500 entries. Export uses a main-owned save dialog; cancelling it writes nothing.

The bridge contracts contain no runtime schema dependencies; Zod validation runs in the feature/main process, preserving sandboxed preload loading. All native handles, geometry, window registration and file paths belong to main. Only the registered testbed main frame can request testbed input.

## Opt-in native regression harness

```sh
npm run test:native:dev
# After closing the app and stopping Vite:
npm run build
npm run test:native:start
```

The harness opens the normal panel and testbed but does not move the pointer until **Native-проверки: ввод, фокус, закрытие** is pressed in the testbed. It runs bounded synthetic actions across all three pages, Shift, a delayed observation, focus loss, geometry invalidation, and closing the target while inputs are owned. It prints `INPUT_NATIVE_SUITE` with individual results. It deliberately switches focus and closes the testbed; leave the main panel open until the operator announces the next step, then close it. These native checks are outside `npm test`.

## Native compatibility probe

Close other PoE Autocraft instances before running a probe. From the repository root:

```sh
npm run probe:dev
```

Leave the probe window open, click **Start native probe**, release the mouse, and do not move it briefly. The probe jumps instantly to the center of its own client area and sends one primary click; it does not demonstrate smooth motion. It prints an `INPUT_PROBE` JSON result, displays confirmation or failure for 1.5 seconds, and exits. The result includes Electron/Node/Koffi versions, architecture, INPUT layout, and received trusted events. If the target loses focus or moves, the probe fails rather than clicking another window.

After the dev probe exits, ensure Vite has stopped before testing a fresh build:

```sh
npm run build
npm run probe:start
```

Repeat the Start-button check; the window closes itself after reporting success or failure. Closing it manually before the click cancels acceptance. These commands take control of the system cursor and are explicitly opt-in; they are never part of `npm test`.

Isolated guard checks: `npm test -- tests/input/native-probe.test.ts`. They use a fake driver and do not establish native delivery.

## Planner and runner contracts

`src/features/input/index.ts` exposes pure version-1 motion planning and the serialized runner. All planned positions are local client DIP; `toPhysical` maps them to the current Win32 physical client rectangle, and `toAbsolute` normalizes against the signed virtual desktop. Plans starting outside the client are rejected.

The planner uses Mulberry32 seeds (including zero), cubic Bezier curves with eased progress, and inset-safe click targets. Default movement is 550–850 ms, holding a button 45–100 ms, 36 intervals, and a 4 DIP target inset. Custom settings are bounded and validated; identical inputs/seed/settings reproduce planned positions and timings. OS scheduling can differ. Geometry snapshots and planner version are part of reproducible trace context.

The runner returns `delivered`, `rejected`, `stopped`, or `failed`; `delivered` means input delivery only, never a confirmed item change. It runs one action at a time, checks the target before each event, rejects pre-held input, and cleans up only the Shift/button it owns. Cancellation discards pending events; partial injection is not retried. Cleanup failures are reported explicitly because release cannot be guaranteed if the OS refuses it. A focus check cannot eliminate the race between checking and injecting an OS event.
