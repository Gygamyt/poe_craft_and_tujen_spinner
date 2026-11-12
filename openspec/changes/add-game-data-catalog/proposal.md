# Proposal

## Why

The repository currently has synthetic item/planner contracts and calibration JSON, but no real base-item or modifier catalog. A first crafting recipe needs traceable game data rather than hard-coded names or an economy feed mistaken for crafting rules.

## What Changes

- Add a local SQLite catalog of base items, item classes, modifiers, stats, translations, tags, groups, and ordered weights from validated, versioned JSON bundles.
- Add a RePoE-compatible import adapter and a reproducible developer workflow that pins an upstream revision and records source provenance and game-version coverage.
- Add atomic activation, offline lookup, catalog status, and a small read-only catalog browser to inspect bases and modifiers before defining a recipe.
- Distinguish raw catalog facts from recipe-specific eligibility and probability calculations; expose unsupported or incomplete data explicitly.
- Keep calibration settings in their existing JSON store. Keep prices and poe.ninja integration outside this change.

## Capabilities

### New Capabilities

- `game-data-catalog`: Versioned import, offline queries, provenance, and inspection of game data used by future crafting strategies.

### Modified Capabilities

None.

## Impact

- Follows organize-feature-modules and add-input-testbed in the agreed implementation sequence; the catalog itself has no native-input dependency.
- Adds a game-data feature, SQLite adapter, developer import tooling, small fixture bundles, and catalog UI/IPC.
- Uses the SQLite API verified in the current Electron runtime; stores the database under the application user-data directory.
- Assumes Path of Exile 1, matching the existing reference layouts. PoE 2 and automatic recipe execution require separate scope.
- A usable real snapshot must pass a source/version/coverage acceptance gate; a synthetic fixture cannot satisfy that gate.
