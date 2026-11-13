# Tasks

## 1. Native compatibility gate

- [x] 1.1 Add the Windows x64 Koffi adapter skeleton and owned-target probe, keeping native code outside renderer bundles; verify native module loading, INPUT structure layout, foreground lookup, cursor lookup, and one delivered click in Electron dev and build/start. Stop and revise the plan if the gate fails.
- [x] 1.2 Document probe commands, dependency rationale, and actual runtime results in an input ADR and current-state.md; verify probe output records Electron/Node/architecture and received target events rather than DOM-dispatched substitutes.

## 2. Motion and action execution

- [x] 2.1 Implement public input contracts and seeded bounded motion planning; verify focused tests cover replay, varied inset targets, invalid timing, tiny/disabled cells, negative desktop origins, scale mapping, and path bounds; document units and planner-version semantics.
- [x] 2.2 Implement the serialized runner and fake-driver tests; verify held-input rejection, cancellation at scheduled boundaries, cleanup, concurrent-request rejection, partial delivery, and no automatic retry pass; document result states and focus-check limitations.
- [x] 2.3 Wire named IPC and the Win32 driver with main-owned target registration and geometry tokens; verify sender/handle/coordinate rejection, target loss, bounds/scale invalidation, and owned-input cleanup in adapter tests.

## 3. Testbed and observations

- [x] 3.1 Add the sandboxed local testbed window, inventory, and three stash pages with cloned fixture geometry; verify page/slot targeting, navigation restrictions, and that existing calibration data is unchanged; add testbed usage instructions and code-map entries.
- [x] 3.2 Implement seeded fixture reset, currency selection/application, Shift-click demonstration, versioned observations, and fault controls; verify deterministic outcomes, empty balances, missing items, delayed/missing/stale observations, reset epochs, and close-during-run tests.
- [x] 3.3 Add bounded traces, main-owned JSON export, Stop/Escape controls, and focused test commands; verify planned/delivered/received event correlation, sender permissions, export cancellation, and trace limits; document the synthetic-data boundary and stop procedure.

## 4. Integration acceptance

- [x] 4.1 Add and run an explicit opt-in Windows native harness against only the owned testbed; verify primary/secondary clicks, varied safe positions, Shift release, focus-loss cancellation, target closure, and geometry invalidation from actual received OS events in dev and build/start. Announce pointer control and app lifecycle instructions; record unavailable checks honestly.
- [x] 4.2 Run focused and full tests, type checking, lint, format checking, build, strict OpenSpec validation, and git diff --check; update current-state.md with actual native evidence and limitations and commit verified owned paths.

## Workflow follow-up

- Review and approve this plan before implementation; complete organize-feature-modules first.
- Any unavailable required native acceptance needs explicit agreement to transfer to technical debt; synthetic unit tests do not replace it.
- Continue with add-game-data-catalog before defining a real recipe or authorizing a PoE input target.
