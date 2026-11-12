# 0003: Feature ownership and process adapters

**Status:** Accepted for organize-feature-modules.

## Context

Calibration previously crossed domain, main-process, renderer, and layouts directories. Native input and game data would make unrelated files harder to distinguish. Existing isolation, IPC permissions, persisted workspace formats, and accepted calibration behavior must survive the reorganization.

## Decision

Own pure domain logic, application orchestration, contracts, layouts, and UI under `src/features/<feature>/`. Own Electron and filesystem integration under `src/platform/electron/<feature>/`. Retain small main/preload/renderer composition roots at electron-vite's existing entry paths.

Use explicit public exports instead of a global barrel or path aliases. Root indexes contain pure APIs; contracts remain renderer-safe. Application and UI each have their own entry point, so pure consumers cannot accidentally initialize a service or import Vue components. CalibrationStorage remains a pure application port; WorkspaceStore implements it structurally. OverlayMode is a shared contract instead of a type imported from the platform layer.

Check normalized relative imports with a local ESLint rule using the existing parser stack. Cover imports, exports, and literal dynamic imports in TS and Vue scripts, Node built-ins with either spelling, cross-feature private paths, and platform/UI leaks. Tests may access private modules for behavioral coverage. No alias resolver is required because this repository declares no source aliases.

Maintain a short [code map](../code-map.md) and focused feature commands. Organize existing tests by ownership, retaining the full test gate. Add only meaningful import-policy fixtures; do not create tests that merely assert moved filenames.

## Alternatives and consequences

- Keeping process folders with barrels would leave feature navigation distributed across the repository.
- A shared utilities framework would introduce speculative interfaces without real consumers.
- A third-party boundary package is unnecessary for the current relative-path structure; a small path-aware rule can enforce the actual policy.
- Explicit entry points cost a little export maintenance but keep feature discovery and review local. Update the code map when entry points or test commands change.

## Compatibility and acceptance

The accepted calibration baseline is the unarchived `add-calibration-overlay` delta specs plus its recorded native acceptance at 3440x1440 / 125%. This change does not sync or archive it. TD-001 retains unperformed physical DPI and additional-monitor checks.

Keep IPC channel names, sender roles, window behavior, workspace path/schema, layout IDs, slot IDs, and save/revision semantics. Existing tests cover these contracts. Build and one focused dev/build smoke check verify the moved entry paths; record actual outcomes in current-state.md. No database, input executor, or recipe behavior is introduced.
