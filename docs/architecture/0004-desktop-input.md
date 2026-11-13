# 0004: Native desktop input behind an owned-target boundary

**Status:** Accepted and implemented; native dev and build/start acceptance passed.

## Decision

Use Koffi 3.3.8 as a main-process-only Win32 binding, external to electron-vite bundling. Pure planning and execution contracts will remain in the input feature; native window handles and SendInput remain in platform adapters. No renderer may authorize an arbitrary HWND or screen coordinate.

The initial opt-in probe registers only its own sandboxed local Electron window, checks foreground and client geometry before every native event, refuses conflicting physical inputs, and requires matching trusted pointerdown/pointerup/click events from that renderer. A successful SendInput return alone is not acceptance. The probe never opens or writes the calibration workspace.

Use an explicit Start button rather than automatic startup injection: the first automatic attempt loaded Koffi and verified INPUT size/alignment, but foreground validation rejected the target before sending any event. Windows activation is an external condition; a local user gesture makes target selection explicit without weakening the check.

Win32 INPUT is represented with Koffi's aligned struct/union definitions. Before injection, verify x64 size 40, union offset 8, and MOUSEINPUT extra-info offset 24. Buffers encode one event at a time; partial insertion fails without retry. Cleanup sends only releases for inputs owned by the run. Foreground checks minimize but cannot eliminate the OS check/injection race.

## Alternatives

- Per-event PowerShell processes add scheduling overhead and obscure ownership/cleanup.
- DOM-dispatched or Electron-injected renderer events cannot validate the native OS input route.
- A bespoke native addon adds a compiler/toolchain burden before the FFI route has been tested.

## Acceptance

Actual Electron dev and build/start event evidence is required before implementing downstream runner/testbed functionality. Record exact results and limitations in current-state.md. Pure fake-driver tests do not satisfy this gate or TD-001. The full target remains Windows x64 and only the application-owned testbed during this change.

Gate passed on 2026-11-13: Electron 45.3.1 / Node 24.22.2 / Windows x64 / Koffi 3.3.8. Both dev and build/start received one trusted pointerdown/up/click sequence at the expected center, within one DIP; INPUT size=40 and union offset=8. The build ran after Vite stopped. This validates the binding and delivery route, not smooth motion or the full input/testbed acceptance matrix. The probe now leaves a confirmation visible for 1.5 seconds before exiting.

## Runner and testbed integration

The input feature owns seeded motion and a serialized runner using a pure driver port. TestbedSession owns fixture state, bounded trace, action/run/epoch identity and observation confirmation. The Electron host authorizes only registered window main frames and resolves target IDs against current fixture geometry. The Windows adapter owns handles and DIP/physical/virtual-desktop conversion, with tokens covering client bounds, viewport, display identity/scale/rotation and virtual-desktop bounds.

Fixture state is independent of the calibration workspace. Received pointer-up events can apply a synthetic action once; stale/untrusted/mismatched events cannot confirm the current pending action. Every confirmation must advance the fixture sequence in the same epoch/run. Delivery and observation failures stay distinct; delayed or missing confirmation never triggers an automatic retry.

Bridge contracts carry no runtime schema dependencies. Zod lives in the feature validation module, imported by main; preload imports only channel constants and types. Electron's sandbox is retained. Stop, focus/geometry changes and window disposal cancel the runner and release only owned inputs, even after a target has closed. Traces preserve the last 500 entries, and export accepts only a path returned by a main-owned save dialog.

The full opt-in native harness passed 16 checks in each of dev and build/start on 2026-11-13, including focus loss, geometry invalidation, target closure and key/button release. The user confirmed visible smooth motion. This does not close the separate physical DPI/additional-monitor calibration debt.
