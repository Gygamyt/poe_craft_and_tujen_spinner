# Proposal

## Why

The testbed currently treats its item as one inventory cell, although the accepted catalog already retains base dimensions in raw source data. Before a first crafting recipe, item identity, occupied cells and native click targets must agree for multi-cell items.

## What Changes

- Expose validated, snapshot-pinned base dimensions through a typed catalog API and inspector, retaining existing imported bundles and immutable snapshots.
- Add an inventory placement model: instance ID, base ID, snapshot ID, top-left cell, and a rectangular footprint measured in cells.
- Resolve occupied cells and one item target; reject unknown dimensions, overlap, out-of-bounds placement and stale placement before input.
- Map validated placements through the calibrated inventory rectangle to inset click targets using the existing seeded motion planner.
- Extend the isolated testbed with selectable multi-cell examples, cell-to-item hit testing and native acceptance. Currency stash slots retain their separate named-region model.

## Capabilities

### New Capabilities

- `item-footprints`: Source-backed dimensions, inventory occupancy, item target resolution and multi-cell testbed behavior.

### Modified Capabilities

None. This adds a placement capability without changing the synthetic item-parser/planner contracts or calibration requirements.

## Impact

- Follows completed `add-game-data-catalog` and `add-input-testbed`; precedes the first recipe.
- Affects game-data public DTOs/inspector, a pure inventory feature, testbed UI/session/target resolution, named IPC and associated tests.
- No new dependency, SQLite migration, bundle rewrite or calibration migration is required: dimensions can be projected from existing base raw payloads.
- Does not add PoE input targeting, inventory scanning, automatic base recognition, drag-and-drop item movement, packing, rotation, prices or a crafting recipe.
