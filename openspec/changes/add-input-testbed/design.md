# Design

## Context

See proposal.md for scope. Calibration already represents inventory and three irregular stash pages in DIP, but there is no native input implementation. Existing crafting contracts describe synthetic plans only. Build on organize-feature-modules and reuse calibration's public geometry types without reusing or mutating the user's workspace.

## Goals / Non-Goals

**Goals:** Exercise real Windows input against an owned target, reproduce plans with a seed, observe one action before another, and diagnose failures from traces.

**Non-Goals:** Input into PoE, anti-detection claims, exact reproduction of human movement, real crafting probabilities, a production recipe loop, clipboard scraping, or automatic spending retries.

## Decisions

### Pure plans and serialized execution

`features/input` owns a pure seeded planner and a cancellable application runner behind an input-driver port. `features/testbed` owns fixture state, commands, observations, and Vue UI. Platform adapters own native handles, timing, IPC authorization, and OS events. Testbed consumes only public input/calibration contracts; the input feature does not depend on testbed internals.

Plan a single move/click or allowlisted chord, never an unbounded script. Use seeded cubic Bezier motion with bounded control-point variation, monotonic timestamps, bounded delays, and a click point chosen within a cell inset. Start from the actual cursor position. Validate the entire path stays inside the authorized testbed client area; reject invalid paths or targets. Different seeds vary safe positions and timing. Store seed and planner version so plans can be reproduced; real OS scheduling is not promised to be deterministic.

Expose bounded named actions against registered cell IDs, not arbitrary renderer-provided coordinates. Restrict keyboard input initially to the fixture's Shift modifier test; no arbitrary text, shell keys, or global shortcuts. The runner is single-flight. If relevant keys/buttons are already down, reject the run. Track only pressed inputs owned by the run and release those on all exit paths. Cancellation prevents queued events; an already submitted OS event cannot be recalled.

Alternative: fixed centers and constant delays. Rejected because they cannot exercise variation or edge geometry. Alternative: randomness inside the driver. Rejected because it prevents reproducible pure plans.

### Windows adapter and compatibility gate

Use Koffi in the main process to call Win32 SendInput, GetForegroundWindow, GetAsyncKeyState, GetCursorPos, and geometry helpers. Keep it external to main-process bundling and load native code only in the adapter. First verify its Windows x64 binding and INPUT structure layout under the actual Electron runtime, in dev and build/start, using the owned fixture target. If installation, ABI, layout, or bundling fails, stop this step and revise the design before building downstream functionality. Do not silently replace it with a PowerShell-per-event executor.

Map renderer-local DIP through fresh main-owned client geometry to physical screen coordinates, then to normalized virtual-desktop coordinates for SendInput. Preserve negative desktop origins and use the virtual desktop flag. Compare captured bounds/display-scale tokens immediately before each scheduled event; require the registered HWND to remain foreground. Main registers the target from BrowserWindow.getNativeWindowHandle; renderers cannot supply HWNDs. Validate event counts returned by SendInput and fail on partial insertion. Equal-integrity owned windows are sufficient for this phase; do not elevate the app to overcome injection failures.

Focus checks cannot eliminate the OS race between checking foreground and injection. Minimize the interval, stop on the next check, and report this limitation. Cleanup releases are permitted after target loss solely for inputs owned by the run; no further action presses or movement are sent.

Sources: [Microsoft SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput), [MOUSEINPUT](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput), [Koffi](https://koffi.dev/). These establish API behavior, not proof of project compatibility.

### Owned fixture target and observation protocol

Add an explicitly opened sandboxed Electron testbed window and a narrow named preload API with sender checks. Load only local app content and retain navigation restrictions. The testbed includes the 12x5 inventory, selectable General/Atlas/League pages, fixture labels, and a synthetic status banner. Load default fixture geometry from the bundled layout via a cloned testbed model; no writes to calibration storage.

Resolve target rectangles from registered fixture geometry and validate renderer reports against main-known viewport dimensions. Capture actual client-area pixel mapping, rejecting geometry/scale changes instead of guessing. UI buttons arm a run and return focus to the testbed before scheduling. Stop and Escape cancel; clicking another window loses focus and cancels as well.

Fixture actions: secondary click selects a synthetic currency; primary click on an item consumes one fixture unit and performs one seeded synthetic mutation; Shift-click exercises modifier delivery without implementing repeat crafting. A zero balance or missing item returns a fixture rejection. Observation carries run ID, fixture epoch, action ID, item ID, and increasing item version. Confirmation must match the action and be newer than its baseline. Reset cancels the run and increments the epoch, preventing old delayed messages from confirming a new run.

Capture planned points and OS delivery results in main, received pointer/key events and synthetic outcomes in the testbed. Bound each trace buffer and expose a main-owned JSON export dialog. Fault controls delay or omit observations; retain raw events so delivery and application-state failures are distinguishable. No DOM dispatch or Electron sendInputEvent can satisfy native acceptance.

### Verification and documentation

Add focused input/testbed test commands. Pure tests cover seed replay, geometry, delays, cancellation, partial injection, existing held inputs, stale observations, and a fake driver. Native integration covers actual delivered events, safe click positions, modifier cleanup, focus loss, closing the target, and geometry changes. Document exact environment and latency as observations rather than guaranteed timing. Add an ADR, testbed usage instructions, and code-map entries in the relevant implementation steps.

## Risks / Trade-offs

- Native OS tests require an interactive desktop and take control of the pointer -> run only through an explicit native-test command with an announced test window, start notice, and bounded runs; keep them out of npm test.
- Native support or packaged loading can fail -> compatibility gate before runner/UI expansion.
- DIP/physical conversions can drift -> pure negative-origin and scale tests plus owned-target native checks; TD-001 remains separate calibration debt.
- Synthetic state can look authoritative -> visible synthetic labels and independent fixtures, with no game-data dependency.

## Migration Plan

Add native compatibility probe, pure planner/runner, then fixture integration. Existing calibration workspace and startup behavior remain valid. Remove the new feature wiring to roll back; no saved-profile migration. Close tracked native acceptance only with observed results or an explicit agreed debt transfer. Request plan approval before implementation.
