# Code map

Start with the feature row, then read only the contracts and implementation needed for the task. Entry files compose features; they do not own their behavior.

| Area | Public entry points | Implementation | Tests / checks | Architecture |
| --- | --- | --- | --- | --- |
| Calibration | [Pure API](../src/features/calibration/index.ts), [desktop contracts](../src/features/calibration/contracts.ts), [application API](../src/features/calibration/application/index.ts), [views](../src/features/calibration/ui/index.ts) | `src/features/calibration/{domain,application,ui,layouts}/`; `src/platform/electron/calibration/` owns windows, IPC, storage and native modes | `tests/calibration/`; `npm run test:calibration` | [Module boundaries](architecture/0003-feature-modules.md), [overlay](architecture/0002-calibration-overlay.md) |
| Crafting contracts | [Pure API](../src/features/crafting/index.ts) | `src/features/crafting/domain/`; synthetic parser/planner interfaces only | `tests/crafting/`; `npm run test:crafting` | [Desktop baseline](architecture/0001-desktop-boundaries.md) |
| Composition | [Main](../src/main/index.ts), [preload](../src/preload/index.ts), [renderer](../src/renderer/src/main.ts) | Application lifecycle, named bridge exposure, view selection | Calibration desktop/preload integration tests; production build | [Module boundaries](architecture/0003-feature-modules.md) |
| Dependency policy | [ESLint configuration](../eslint.config.mjs), [boundary rule](../tools/eslint/feature-boundaries.mjs) | Resolve imports relative to each file, enforce public and process boundaries | `tests/architecture/`; `npm test` and `npm run lint` | [Module boundaries](architecture/0003-feature-modules.md) |

## Verification

From the repository root:

```sh
npm run test:calibration
npm run test:crafting
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm test` always includes architecture and integration tests. Full checks are required for cross-feature or composition changes. Avoid rerunning successful broad checks after documentation-only task updates.

## Import rules

- Pure feature domain/application code can use its own contracts and pure public APIs of other features. It cannot use Electron, Node built-ins, platform code, UI, or another feature's application layer.
- Feature UI and renderer code cannot import Electron, Node built-ins, or platform adapters.
- Outside a feature, consume its root `index.ts` or `contracts.ts`. Main/platform composition can also consume its application entry; renderer composition can consume its UI entry. Feature-owned platform adapters can use their owned application entry. Internal deep paths are private.
- Tests can import private implementation files to exercise behavior. They are outside the production boundary rule.

Calibration's accepted functional baseline remains in `openspec/changes/add-calibration-overlay/specs/` until that change is archived/synced. Physical DPI checks remain open in [TD-001](progress/technical-debt.md). Input, testbed, and game data have plans but no implementation here.
