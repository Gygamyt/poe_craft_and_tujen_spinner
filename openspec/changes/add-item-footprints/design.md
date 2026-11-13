# Design

## Context

See proposal.md for motivation. `normalizeRePoE` preserves `inventory_width` and `inventory_height` only inside each base's raw payload. The accepted export has 5,461 bases, all with positive integer dimensions, ranging across eleven shapes including 1x1, 1x3, 2x3, 2x4 and 3x2. Plate Vest is 2x3; Driftwood Wand is 1x3. These observations concern the pinned snapshot, not all future exports.

`inventoryCells` projects the calibrated 12x5 region into 60 rectangles. The testbed independently builds 60 cell targets; its single item is `inventory-0`, and only that target currently changes the item. The motion planner already accepts arbitrary target rectangles and rejects rectangles too small for its inset. Native execution already checks window geometry/focus and observation freshness, but has no item placement revision.

Only desktop-shell and crafting-contracts are present in the current main spec inventory; catalog and testbed requirements are in completed change artifacts. This change adds one cohesive capability, item-footprints, without rewriting those artifacts or the user's archive moves.

## Goals / Non-Goals

**Goals:** A shared pure occupancy/projection model; explicit provenance for dimensions; compatibility with existing snapshots; one target and observation identity per item; native evidence on the owned testbed window.

**Non-Goals:** Moving items with the mouse, auto-detecting a base or anchor from PoE, inventory packing, item rotation, item rendering assets, actual PoE input, or changing the existing synthetic parser/planner contracts. The user selects a fixture and its top-left cell; this does not assert that real inventory placement is observable yet.

## Decisions

### Typed projection of existing catalog facts

Add a pure base-dimension decoder to game-data and a snapshot-pinned public lookup returning either `{ status: "known", baseId, snapshotId, width, height }` or an explicit unknown/invalid reason. Missing base/catalog/snapshot retain existing distinct errors. Decode only the two source fields as positive safe integers; do not infer dimensions from class, name or rarity. Oversized positive dimensions remain source facts; fitting them into an inventory is a separate check.

Expose the projection through a named, validated inspector IPC operation and render a size or warning alongside base details. Keep raw payloads authoritative and immutable. The current bundle/schema and SQLite schema remain version 1; no new persisted canonical field is added, so existing strict bundles/checksums and stored records remain valid. Do not rewrite old manifests to claim new coverage. Add synthetic decoder cases and verify the accepted Plate Vest/Driftwood Wand records without a reimport.

Alternative: persist width/height as new SQL columns or extend the strict bundle record immediately. Rejected because the fields are already retained, no dimension filtering/index is needed, and that would introduce avoidable migration/versioning work. A later canonical bundle revision may promote these fields independently.

### Pure inventory feature owns placement

Add `features/inventory` with public contracts and pure functions. Catalog owns base facts; inventory owns cell occupancy and projection; input continues to consume rectangles. This avoids placing inventory semantics in the OS adapter or coupling calibration to catalog storage.

Use zero-based `{ column, row }` anchors and `{ width, height }` cell dimensions. A resolved placement contains instance ID, base ID, explicit snapshot ID, footprint and placement revision. Validation checks safe integers, unique instance IDs, grid bounds and intersections before committing a new state. Helpers support multiple placements and cell-to-instance lookup; the testbed exposes one actionable item plus an optional fixed obstacle for overlap acceptance. No general inventory editor or automatic packing is introduced.

Use half-open cell ranges and point bounds: left/top inclusive, right/bottom exclusive. Adjacent items share a mathematical edge but never share ownership. Unknown dimensions cannot construct an actionable placement. A rejected edit preserves the previous valid fixture and reports its reason.

### Geometry and action context remain separate

Project the item rectangle from the inventory region: `x = area.x + column * area.width / columns`, `y = area.y + row * area.height / rows`, `width = itemWidth * area.width / columns`, and the analogous height. Reuse calibration's public rectangle contracts and the motion planner's inset/seed behavior. Draw the full item rectangle above the cell background; do not add separate actionable controls for its covered cells. Currency sources still resolve by named stash slot ID.

Target actions use item instance IDs. Carry instance/base/snapshot/placement revision through fixture targets and observations. Before delivery, check that context alongside the existing geometry/focus token; reconfiguration must stop the runner before replacing state and advance its context. Old observations cannot confirm a new placement. Invalid or too-small rectangles fail before any native event. This applies to the isolated target only; no production game driver is added.

Alternative: always click the top-left occupied cell. It would work for some currency actions, but would preserve the false single-cell model and fail to exercise item-wide identity/hit testing. Use the whole rectangle with the existing safe inset instead.

### Standalone synthetic acceptance

The testbed remains usable with no catalog. Provide explicitly synthetic 1x1, 1x3, 2x3 and 2x4 presets, column/row controls and an optional fixed occupied obstacle. They exercise the same pure placement model without loading a database. Synthetic base/snapshot references are marked as fixture provenance and never reported as imported game records.

Fixture changes are main-owned validated named commands; renderer-supplied screen coordinates or native handles remain forbidden. Cell hit testing resolves the item instance anywhere in its rectangle. Seeded outcomes, currency consumption and item version semantics stay unchanged. Extend the native harness to receive a click in a non-anchor cell of a large item, verify one action, and exercise stale placement cancellation without losing existing page/focus/close checks.

## Risks / Trade-offs

- Source dimensions may disappear or change type → explicit unknown/invalid results, no 1x1 default, pinned snapshot references.
- Retained legacy records may have malformed raw data → decoder rejects actionability without rewriting the snapshot or making the entire catalog unusable.
- Covered cell controls can intercept pointer events → one item surface above a non-actionable background, shared hit testing and native received-event evidence.
- Geometry can be valid while placement is stale → separate placement revision plus existing target geometry/focus checks.
- A valid footprint does not establish real item location → fixture anchors are explicit; actual observation belongs to the first-recipe design.
- Existing baseline harness expectations use inventory-0 → update references coherently to instance identity and retain regression checks for all stash pages.

## Migration Plan

After plan approval, add typed catalog reads and pure placement contracts, then wire the testbed and native harness. Existing calibration JSON, catalog files and immutable snapshots remain untouched by upgrades. Resetting the transient testbed creates its default fixture. Record decisions in a new ADR and update code-map, testbed/catalog guides and current-state with actual acceptance evidence. Rollback removes feature wiring without rewriting user data. Run owned-window native acceptance in dev and build/start; explicitly state when the user must leave windows open and when to close them. Keep existing physical DPI debt separate.
