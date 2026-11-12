# Tasks

## 1. Feature ownership

- [x] 1.1 Move calibration pure logic and bundled layouts into the feature boundary with explicit public exports; move existing tests and verify geometry, schema, editor, scene, snapshot, and workspace suites plus type checking pass.
- [x] 1.2 Move item-parser and crafting-engine contracts into the crafting feature without changing their interfaces; verify all existing crafting-contract tests pass.
- [x] 1.3 Add the initial code map and module-boundary ADR; verify every mapped entry point and test path exists and document the accepted calibration baseline and TD-001.

## 2. Desktop integration and development checks

- [x] 2.1 Move calibration orchestration, storage, Electron adapters, preload wiring, and Vue views to the designed boundaries; verify existing service, native-adapter, preload, persistence, and revision-ordering tests pass and production build succeeds without changing stored data or IPC permissions.
- [x] 2.2 Enforce platform and cross-feature import boundaries using ESLint and add rule fixtures for allowed imports, private-path bypasses, Node built-ins, re-exports, Vue imports, and literal dynamic imports; verify rule tests and lint pass.
- [x] 2.3 Add test:calibration and test:crafting commands and update README/code-map links; run both commands and confirm their test inventories exclude unrelated suites while npm test includes everything.

## 3. Integration acceptance

- [x] 3.1 Run type checking, lint, format checking, the full test suite, build, strict OpenSpec validation, and git diff --check; record results and limitations in current-state.md and commit only verified task-owned paths.
- [x] 3.2 Perform one focused dev and built-app smoke check covering edit/save/preview/hide and loading an existing workspace; tell the user when to leave the app open and when to close it, and record the actual environment without claiming TD-001 completion. If unavailable, explicitly agree a debt transfer before removing this acceptance task.

## Workflow follow-up

- Review and approve this plan before implementation.
- Archive the accepted calibration change through its own archive workflow; preserve TD-001.
- After completing this change, proceed to add-input-testbed, then add-game-data-catalog, and define the first crafting scenario against the selected catalog snapshot.
