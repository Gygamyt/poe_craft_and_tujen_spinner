# Proposal

## Why

The application can calibrate inventory and stash geometry but cannot execute or verify desktop input. Before a real crafting recipe, provide an isolated target that exercises the same native input boundary and exposes movement and action failures reproducibly.

## What Changes

- Add seeded mouse trajectories, varied safe click positions, bounded timing, and a cancellable action runner.
- Add a Windows native input adapter restricted in this change to an application-owned testbed window.
- Add an Electron testbed page with a 12x5 inventory and General, Atlas, and League stash pages, synthetic items/currencies, and event traces.
- Support one-action tests, deterministic fixture resets, focus-loss cancellation, and injected missing/delayed observations.
- Keep synthetic currency effects explicitly separate from real game rules.

## Capabilities

### New Capabilities

- `desktop-input`: Reproducible bounded desktop input with target authorization, cancellation, and execution results.
- `input-testbed`: An isolated interactive fixture target with observable input events and deterministic synthetic state.

### Modified Capabilities

None.

## Impact

- Depends on completion of organize-feature-modules.
- Adds input and testbed features, Windows adapters, named IPC methods, focused tests, and a native integration harness.
- Proposes Koffi for Win32 calls, with an early Electron dev/build compatibility gate before downstream implementation.
- Does not authorize input into PoE, select a real recipe, synchronize game data, or change saved calibration profiles.
