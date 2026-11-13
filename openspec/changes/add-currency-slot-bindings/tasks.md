# Tasks

## 1. Preset evidence and semantic contracts

- [ ] 1.1 Review the three existing currency reference screenshots against the bundled page/slot IDs and accepted catalog currency records; record evidence, unknown patch/league applicability and coverage, and produce at least one verified partial preset with tests for nonexistent/duplicate slot references and missing currency IDs. Leave uncertain positions unassigned; stop for source clarification if no real entry can be verified. Document preset review in a bindings guide and ADR.
- [ ] 1.2 Define versioned binding scopes, catalog references, overrides/clear tombstones, draft revisions and preset acceptance schemas; verify page-local ID isolation, manual/preset/clear precedence, stale draft rejection, context/layout version isolation and explicit revalidation in focused tests; document public contracts and code-map entry.

## 2. Persistence and source resolution

- [ ] 2.1 Add the main-owned bounded JSON store with atomic queued saves and preserved-file recovery; verify missing settings, reopen, interrupted/failed writes, corrupt/newer schemas and explicit backup/reset while catalog/calibration files remain byte-for-byte unchanged; document storage and recovery commands/flows.
- [ ] 2.2 Implement effective labels and the read-only configured-source resolver; verify disabled/unassigned/incompatible/unresolved/ambiguous reasons, explicit selection among duplicate currencies, current calibrated bounds, pinned catalog/layout/binding revision and unknown presence/quantity; add resolver usage and limits to the ADR/guide.

## 3. Authorized editor and labels

- [ ] 3.1 Share the main-owned catalog reader with the bindings host and expose bounded named search/draft/save/read/subscription operations; verify currency-tag classification, missing record/snapshot handling, unauthorized windows/subframes, invalid payloads, stale catalog/layout context, listener disposal and shared worker shutdown without weakening the existing catalog inspector checks; document host ownership.
- [ ] 3.2 Add the sandboxed bindings editor with explicit Standard/named-league context, three-page schematic selection, currency search, assign/clear/restore-default actions, preset preview/coverage, Save/Cancel and visible provenance/unresolved states; verify draft cancellation, failed-save feedback and partial presets with focused UI/application tests; update user-facing usage instructions.
- [ ] 3.3 Integrate saved effective names with calibration edit/preview through read-only label snapshots; verify identical names/fallback IDs in both modes, no mutation of geometry/defaultLabel identity, no changes from unsaved drafts, disabled-slot handling and display/DPI-independent assignments; record compatibility results in current-state.

## 4. Desktop and integration acceptance

- [ ] 4.1 Run dev and fresh build/start desktop acceptance using real catalog currency IDs: assign different values to page-local matching slot IDs, clear a preset default, cancel an edit, save/restart offline, inspect edit/preview labels and switch context; verify controls remain accessible at minimum and ultrawide/maximized sizes, preservation of calibration/catalog files, and no game input. Record actual evidence and clearly state when to leave windows open or close them.
- [ ] 4.2 Run focused and full tests, typecheck, lint, format check, build, strict OpenSpec validation and diff checks; record actual preset coverage, catalog/native limitations and unchanged DPI debt; commit only verified task-owned files.

## Workflow follow-up

- Review and approve the plan before implementation; all new OpenSpec content remains English.
- Review the completed change before archive. Preserve unrelated archive moves and staged user changes.
- Design live presence/count observation and the first recipe separately. These assignments do not authorize PoE input, prove a stack exists or supply a spending budget.
