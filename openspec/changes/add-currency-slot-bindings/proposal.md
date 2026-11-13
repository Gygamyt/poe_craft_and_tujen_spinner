# Proposal

## Why

Calibrated Currency Stash regions identify where to click but not which currency each region represents. Before a recipe can resolve a currency source, users need persistent, reviewable slot assignments that remain independent of screen geometry and do not imply live item availability.

## What Changes

- Add versioned currency-to-slot assignments for General, Atlas and League pages using stable catalog base IDs and page/slot IDs.
- Provide an editor with a clickable stash schematic, bounded catalog currency search, assign/clear actions, draft Save/Cancel and visible assignment provenance.
- Support evidence-backed layout presets and explicit user overrides, including clearing a preset assignment. Partial presets leave unidentified slots unassigned.
- Store assignments separately from calibration and catalog data; handle incompatible layouts, changed league context, unavailable records and damaged settings explicitly.
- Display effective currency names in the schematic and existing overlay labels without changing calibrated regions.
- Expose a read-only source resolver for future recipes; unassigned, disabled, incompatible or ambiguous sources cannot resolve silently.

## Capabilities

### New Capabilities

- `currency-slot-bindings`: Semantic currency assignments, preset precedence, persistence, compatibility and source resolution over calibrated stash slots.

### Modified Capabilities

None. Existing catalog facts and calibration geometry contracts remain independent.

## Impact

- Adds a currency-bindings feature, a main-owned JSON store, authorized editor IPC/UI and calibration label integration.
- Reuses the offline catalog and existing three-page geometry; no SQLite or calibration-file migration is required.
- Preset publication requires recorded evidence and review; this change does not promise that every reference slot can be identified from existing screenshots.
- Excludes account OAuth/API integration, OCR/image recognition, live stash scanning/counts, automatic in-game currency rearrangement, recipe execution and PoE input targeting.
