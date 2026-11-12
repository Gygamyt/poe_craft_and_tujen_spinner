# Design

## Context

See proposal.md for motivation. Calibration currently occupies `src/domain/calibration-*`, `src/main/calibration-*`, workspace storage, three Vue views, and bundled layouts. Crafting consists of two pure contract files and synthetic tests. Main and preload compose a named IPC API; workspace persistence already rejects unsupported data. Calibration acceptance is recorded in `add-calibration-overlay`; physical DPI debt remains TD-001. That change is complete but not yet archived or synced, so its accepted delta specs remain the calibration baseline.

## Goals / Non-Goals

**Goals:** Make a feature change discoverable from one small index; separate pure logic, views, application orchestration, and platform integration; preserve existing external contracts.

**Non-Goals:** Rewrite working calibration behavior, generalize every helper, change workspace formats, add a recipe engine, or execute input. No arbitrary file-size target or claimed token-saving percentage.

## Decisions

### Feature ownership with process-specific adapters

Use this structure, creating directories only when they contain implementation:

```text
src/features/calibration/
  domain/          # geometry, layouts, workspace, editor, scenes, snapshots
  application/     # calibration service and persistence port
  contracts.ts     # renderer-safe schemas and desktop API
  index.ts         # explicit public pure contracts
  ui/              # App, Overlay, PreviewControls and cohesive UI helpers
  layouts/         # bundled geometry JSON and loader
src/features/crafting/
  domain/          # existing item parser and planner contracts
  index.ts
src/platform/electron/calibration/
  desktop.ts       # windows, sender authorization, IPC and modes
  workspace-store.ts
src/main/index.ts  # main-process composition and application lifecycle
src/preload/index.ts
src/renderer/src/main.ts
```

Move `overlay-mode` and `preview-controls` with their Electron adapter. Split pure service orchestration from filesystem storage via the existing store interface; do not pull Electron into application logic. The renderer entry point selects views; preload exposes named operations. These entry points remain stable for electron-vite. Future input, testbed, and game-data modules follow the same pattern when implemented.

Alternative: keep process-based folders and add barrels only. Rejected because feature discovery still requires tracing several unrelated folders. Alternative: a shared utilities layer. Avoid until two real consumers need a stable shared concept.

### Narrow public entry points and enforced imports

Use explicit exports, relative paths, and no repository-wide barrel. Renderer consumers import renderer-safe contracts or views, never platform code. Pure domain/application files cannot import `electron`, Node built-ins (including unprefixed spellings), or platform adapters. Other features import public entries only. Composition roots and platform adapters can import their declared owned application entry points.

Implement restrictions using the existing ESLint stack, covering TypeScript and Vue imports, relative-path bypasses, re-exports, and literal dynamic imports. A small local rule is acceptable if path-aware checks cannot be expressed with built-in restrictions. Add focused rule fixtures for allowed and rejected imports so the policy is enforceable rather than documentation only. Avoid a new boundary-analysis dependency.

### A short map and feature test commands

Add `docs/code-map.md` containing one table of feature ownership, entry points, tests, and ADR links, followed by focused commands. Link it from README. Keep source-specific notes beside the relevant feature rather than duplicating code explanations in AGENTS.md. Retain tests under `tests/`, organized into calibration, crafting, and architecture suites with shared fixtures only where needed. Add `test:calibration` and `test:crafting`; retain `npm test` as the full gate.

### Preserve compatibility while moving files

Keep named IPC channels, sender roles, window behavior, storage location/schema, imported layout schema, slot IDs, revision ordering, and save/load failure behavior unchanged. Existing tests follow their owned modules. Add compatibility assertions only for contracts not already covered. Do not create shallow tests that merely assert new filenames.

## Risks / Trade-offs

- Moving files can break preload or renderer bundling -> run type checking, existing tests, and production build after coherent moves.
- Broad barrels can accidentally import platform code into Vue -> explicit environment-safe exports and lint fixtures.
- A large service can remain difficult to navigate -> extract cohesive responsibilities only where existing tests provide coverage; no speculative abstractions.
- Native visual regressions can escape isolated tests -> request one focused dev/build calibration smoke check, explicitly stating when to keep the application open and when to close it. Report unavailable acceptance honestly; do not reclassify TD-001 as passed.

## Migration Plan

Move pure modules and tests first, then adapters and views, then enforce boundaries and document entry points. Keep the existing calibration workspace usable throughout; no user-data migration or reset is permitted. Revert the owned source/configuration commit to roll back. Record the final module decision in a new ADR and task verification in current-state.md. Implementation starts only after plan approval; archival of the earlier change is a separate workflow.
