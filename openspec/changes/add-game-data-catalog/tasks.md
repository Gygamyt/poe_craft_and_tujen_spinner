# Tasks

## 1. Runtime and source acceptance gates

- [x] 1.1 Add the SQLite repository port and minimal worker entry point; verify node:sqlite worker loading, file-backed reopen, and a simple query under Electron dev and build/start before downstream catalog work; record exact runtime results.
- [x] 1.2 Pin mutually consistent RePoE PoE 1 export revisions and translation sources, inspect schemas/notices and patch evidence, and record the supported coverage in a catalog ADR and source manifest; verify one real base/modifier/stat chain resolves without fabricated fields. Revise scope if no compatible source satisfies this gate.

## 2. Bundles and reproducible refresh

- [ ] 2.1 Define manifest, canonical record, coverage, and query schemas with small synthetic bundles; verify unsupported game/schema, duplicate IDs, invalid ranges, unknown patch metadata, ordered zero weights, translation fallbacks, and broken cross-references in focused tests.
- [ ] 2.2 Implement bounded pinned-source fetch and normalization tooling plus local bundle validation; verify hashes, immutable revision selection, timeout/failure handling, path traversal rejection, file limits, and deterministic normalization using local HTTP fixtures; document exact refresh/build/import commands and attribution.

## 3. Offline storage and lookup

- [ ] 3.1 Implement schema-versioned SQLite storage and atomic snapshot activation; verify file-backed tests cover rollback, interruption before activation, first-import failure, foreign-key integrity, reopen, previous-snapshot selection, and preservation of existing calibration files.
- [ ] 3.2 Implement bounded stable-ID and search queries with snapshot pinning; verify pagination, literal search escaping, class/domain/tag filters, missing-catalog/not-found distinctions, ordered weights, raw payload retention, and consistent results across activation; document the public query API and coverage limits.
- [ ] 3.3 Add corruption/newer-schema handling without destructive reset and backup-before-migration policy; verify preserved files and actionable error results in recovery tests and document recovery procedures.

## 4. Catalog inspection

- [ ] 4.1 Add main-owned import dialogs and named IPC plus status, snapshot selector, base/modifier search, and detail UI; verify sender authorization, invalid payload rejection, import cancellation, bounded DTOs, provenance display, and unsupported/translation fallback states; update README and code-map entries.
- [ ] 4.2 Import the accepted real pinned bundle and inspect a base/modifier/stat chain offline after restart; verify source revisions and patch evidence are shown, record import size/duration and query responsiveness, and confirm switching snapshots leaves calibration data unchanged. Synthetic fixtures alone cannot close this task.

## 5. Integration acceptance

- [ ] 5.1 Run focused catalog and full tests, type checking, lint, format checking, build, strict OpenSpec validation, and git diff --check; record actual source/native/runtime limitations in current-state.md and commit only verified task-owned paths.

## Workflow follow-up

- Runtime gate passed: source-worker tests and actual emitted-worker dev/build probes verified SQLite persistence and reopen.
- Source gate passed: pinned source files, SHA-256 hashes, notices, counts and a real base/modifier/stat/English-translation chain are recorded in docs/reference/game-data-source-candidate.json. Normalized bundle/import acceptance remains separate.

- Review and approve this plan before implementation; follow the agreed structure -> input/testbed -> catalog sequence.
- Define the first recipe with the user after inspecting an accepted catalog: base/item level/state, success predicates, allowed currencies, budget, supported mechanics, and stop conditions.
- Prepare a separate first-recipe change covering fresh item observation, goal evaluation, one-action execution, and budget accounting; adding PoE as an input target requires that change's explicit design and acceptance.
- Price data, poe.ninja caching/backend integration, and scheduled background refresh remain separate future scope.
