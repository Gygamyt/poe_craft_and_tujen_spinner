# Input testbed

The feature is in progress. The native compatibility probe has passed in dev and build/start. It does not execute input into PoE or load/save calibration profiles.

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
