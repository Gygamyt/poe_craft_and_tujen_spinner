# Tasks

## 1. Catalog dimensions and compatibility

- [x] 1.1 Add the typed, snapshot-pinned base dimension projection and public lookup; verify known sizes, absent/partial/non-integer/non-finite/zero/negative dimensions, unavailable IDs/snapshots and snapshot activation using focused decoder and file-backed tests; document the API and no-migration decision in the catalog guide and a footprint ADR.
- [x] 1.2 Expose a validated named dimension IPC operation and show dimensions/unknown reasons in base details; verify sender/subframe authorization, invalid payload rejection, bounded DTOs and preload exposure; inspect Plate Vest 2x3 and Driftwood Wand 1x3 from the existing accepted snapshot without reimport and record the result in current-state.

## 2. Inventory occupancy and projection

- [x] 2.1 Add the pure inventory feature with placement validation, occupied-cell ownership and point hit testing; verify 1x1/1x3/2x3/2x4 and wider shapes, exact grid edges, duplicate IDs, adjacent items, overlaps, invalid coordinates and unknown dimensions; publish its contracts and code-map entry.
- [x] 2.2 Add placement-to-screen target resolution and versioned item context; verify proportional projection into several inventory rectangles, inset click containment over deterministic seeds, too-small targets, empty cells and stale item/snapshot/placement rejection before native input; document coordinate and cancellation rules in the ADR.

## 3. Isolated multi-cell testbed

- [x] 3.1 Add synthetic footprint presets, anchor controls, an overlap obstacle and one item surface spanning occupied cells through main-owned validated commands; verify invalid edits preserve state, non-anchor cells resolve to the same instance, seeded replay, single currency consumption/version updates and unchanged named currency targets across General/Atlas/League; update the testbed guide.
- [x] 3.2 Integrate placement revisions with session/runner cancellation and fresh observations; verify pending runs stop on reconfiguration, old observations cannot confirm a new placement, owned input is released, and existing reset/focus/geometry/close behavior remains covered without calibration writes.
- [ ] 3.3 Extend the owned-window native harness and run dev plus fresh build/start acceptance with PoE closed; verify a received native click in a non-anchor cell of a multi-cell item, exactly one currency consumption/item update, stale-placement rejection and the existing three-page regression checks; record actual results and explicit open/close instructions in current-state.

## 4. Integration acceptance

- [ ] 4.1 Run focused inventory/catalog/testbed checks, full tests, typecheck, lint, format check, production build, strict OpenSpec validation and diff checks; confirm existing catalog/calibration files need no migration, document verification limits and unchanged DPI debt, and commit only verified task-owned paths.

## Workflow follow-up

- Review and approve these artifacts before implementation.
- Review the completed change before archive; do not absorb unrelated pending archive moves or staged user files.
- Define the first recipe separately, including how a real item base, anchor and fresh observation will be obtained. This change does not authorize a PoE input target.
