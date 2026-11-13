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
