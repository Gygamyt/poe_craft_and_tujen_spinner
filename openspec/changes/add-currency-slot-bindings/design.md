# Design

## Context

See proposal.md for motivation. Current calibration templates provide page-local slot IDs, normalized bounds and optional `defaultLabel`; the bundled reference has no currency identities. Profiles hold calibrated bounds and enabled flags. Workspace merge already distinguishes metadata updates from geometry-version changes. The catalog contains stable currency base IDs, names, tags and raw source records, but no verified mapping to our screenshot-derived slot IDs.

Existing reference images are `docs/reference/First currency.jpg`, `Second currency.jpg` and `Third currency.jpg`. They can support reviewed mappings but do not by themselves establish a current league/patch or actual stash contents. The accepted catalog snapshot supplies currency identities, not the identity of a particular screen location.

The official [Account Stashes API](https://www.pathofexile.com/developer/docs/reference#account-stashes) requires account authorization and is a separate integration. It does not remove the need to validate special-tab coordinates against our screen geometry. This design uses explicit offline configuration.

## Goals / Non-Goals

**Goals:** One semantic binding per scoped slot, reviewed partial defaults, explicit overrides/clears, offline persistence and a deterministic read-only resolver. Display assignments consistently while preserving calibrated rectangles.

**Non-Goals:** OAuth, API synchronization, OCR, image matching, live amounts, currency relocation, stash-tab navigation automation, crafting eligibility or execution. An assigned source is configured, not proven present or spendable.

## Decisions

### A separate semantic feature and store

Add `features/currency-bindings` for schemas, effective assignments, compatibility checks, draft operations and source resolution. Use `currency-slot-bindings.json` under app userData with its own schema version, independent of calibration-workspace.json and game-data.sqlite. Main owns atomic writes, bounded reads, queued saves and preserved-file recovery; no renderer paths or SQL are accepted.

Binding scope is `{ game: "poe1", layoutId, geometryVersion, contextKey }`. Context is explicitly user-selected Standard or a named league, with an unconfigured initial state. It is not inferred from the catalog's unknown league applicability. Scope records include a binding revision, selected catalog snapshot, accepted preset identity/version and user overrides. Keys use structured encoding, not ambiguous delimiter concatenation. Bindings are independent of display ID/resolution/DPI; enabled state is read from the current calibration profile during resolution.

Alternatives: put currency IDs into `defaultLabel`, calibration slot bounds or SQLite game facts. Rejected because labels are presentation, screen geometry is user-specific, and source catalog snapshots are immutable game facts. Existing files need no migration.

### Catalog identity and availability

Currency selection uses bounded offline base queries filtered by the source `currency` tag; confirm the selected base still has that tag in the pinned snapshot before assignment. This identifies currency-like catalog records, not their eligibility for any crafting method. The inspector's current IPC authorizes only its own window, so the new editor must not call that bridge as a shortcut. Share/inject the main-owned catalog reader into both hosts while retaining their separate sender/main-frame checks and worker lifecycle.

Persist stable IDs and snapshot provenance, with an optional cached display name for diagnostics only. Missing snapshots/records remain unresolved; never remap by name. Revalidation against another snapshot is explicit, staged and checks the same stable ID/classification. Save uses revision checks to reject stale drafts; catalog or layout context changes invalidate ongoing selection/search results rather than mixing contexts.

### Presets are evidence-backed data

A preset declares ID/version, game/layout/geometry compatibility, known patch/league applicability, references to evidence, a reviewed page/slot-to-base mapping and coverage counts. Unknown patch/league metadata remains unknown. Preview requires the user to confirm applicability to the selected context before staging it; it is never silently applied merely because a label says League.

Initial source gate: review the three existing screenshots against the bundled slot IDs and accepted currency records, record actual evidence and publish at least one verified partial reference preset. Do not identify indistinct icons by guessing. General, Atlas and League positions without evidence stay unassigned and manually editable. If no mapping can be verified, pause for source clarification instead of shipping a fake or synthetic-only default. Full coverage of all reference slots is not an acceptance requirement.

Effective precedence is explicit user assignment or clear, then the accepted preset version, then unassigned. Store clears as tombstones so applying/updating defaults cannot resurrect a cleared slot. A new preset version is offered for review, not substituted automatically. A scoped Restore default action removes an override only after showing the result. Manual assignments can be made even where no preset mapping exists.

### Dedicated editor and shared labels

Open a sandboxed bindings window from the main panel. It provides context/layout selection, three page tabs, a clickable schematic from existing normalized slot regions, currency search, assign/clear/default actions and Save/Cancel. Show enabled/disabled state, manual/preset/unassigned/unresolved origin and partial preset coverage. Use a scrollable layout with accessible controls at minimum size and on ultrawide/maximized windows; avoid repeating the testbed's clipped absolute controls.

Saved effective labels flow through a bounded read-only presentation snapshot to calibration edit/preview. Overlay consumers can read/subscribe; only the registered bindings editor main frame may mutate drafts/save. Disposing listeners/windows removes handlers. Preserve the same visual labels across edit and preview, retain slot IDs as fallbacks, and leave geometry/drag behavior untouched. Binding Save affects labels; calibration Save remains a separate operation. No in-game interaction is required to edit bindings.

### Resolution and compatibility

The pure resolver takes a saved scope/revision, explicit catalog reference, current template/profile and requested currency plus optional page/slot. It returns one compatible configured source or a typed missing/disabled/incompatible/unresolved/ambiguous reason. Multiple slots may legitimately hold the same currency; never impose global currency uniqueness or choose one by array order. Return page/slot identity, calibrated region, binding revision and snapshot/layout context, with presence/quantity unknown. Draft changes are not actionable sources.

Selecting a different scope loads only its saved mappings. Copying a previous scope is an explicit preview/revalidation action, not migration by matching slot numbers. Geometry-version changes require review even if IDs look unchanged. Same-version geometry conflicts are already rejected by calibration imports; label-only metadata changes must not overwrite semantic identities. Existing bindings survive unavailable catalogs, disabled slots and temporarily absent layouts for later repair.

## Risks / Trade-offs

- Screenshots lack reliable patch labels or readable icons → preserve unknown applicability, use reviewed partial presets and explicit confirmation; leave uncertain slots unassigned.
- Users can configure a currency different from actual contents → label it as configuration; presence/count verification belongs to a future observation change.
- JSON corruption or interrupted writes → preserve the original, atomic replacement, explicit backup/reset recovery and tests before claiming Save success.
- Catalog refresh or concurrent editor changes → pinned references, bounded revisioned DTOs, stale-draft rejection and explicit revalidation.
- Read access to overlay labels could expose mutation operations → separate read/mutate authorization, validate all payloads and test unauthorized windows/subframes.

## Migration Plan

After approval, verify preset evidence and define feature contracts, then implement resolver/storage, main-owned catalog reuse and editor/label integration. Missing binding settings mean unconfigured; never seed actionable assignments merely from existing defaultLabel text. Existing catalog/calibration files are byte-preserved. Record decisions in an ADR, update guides/code-map/current-state and verify dev plus fresh build/start Save/restart/cancel/preview flows. Keep physical DPI debt separate. Rollback removes wiring while preserving the independent settings file. Do not start recipe execution or a PoE input adapter in this change.
