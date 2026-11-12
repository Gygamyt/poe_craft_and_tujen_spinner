# Proposal

## Why

Calibration currently spans shared domain, main-process, and renderer folders, so even a small feature requires reading many unrelated entry points. Establish explicit feature boundaries and a short code map before adding native input and game data.

## What Changes

- Group calibration and existing crafting contracts by feature, preserving runtime behavior, IPC permissions, stored data, and public npm commands.
- Keep Electron, filesystem, and future native-input integration behind platform adapters and small composition roots.
- Add a maintained code map, enforceable import boundaries, and focused feature test commands to reduce investigation and verification scope.
- Preserve the accepted calibration behavior and the unperformed physical checks in TD-001.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-shell`: Extend the documented development workflow with discoverable feature entry points, checked dependency boundaries, and focused test commands.

## Impact

- Affects `src/domain`, `src/main`, `src/preload`, `src/renderer`, `src/layouts`, tests, ESLint, npm scripts, and development documentation.
- No new production dependencies, database changes, game interaction, or UI redesign.
- This is the first implementation change in the agreed sequence. The input testbed follows; the game-data catalog then precedes the first crafting recipe.
