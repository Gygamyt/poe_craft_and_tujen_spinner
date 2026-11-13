# Game-data catalog

The SQLite-worker runtime gate has passed in headless, Electron dev and build/start modes. There is no installed real item/modifier catalog or catalog UI yet. See [ADR-0005](architecture/0005-game-data-catalog.md) for decisions and limitations.

## Checks available now

```sh
npm run test:catalog
```

The tests start actual Node workers, use isolated file-backed scratch databases, and verify persistence/reopen and lifecycle failure paths. They do not open calibration storage or production user data. The worker returns `available: false` while no snapshot implementation exists; it does not disguise this as a valid empty catalog.

The same source-worker tests can run without a GUI under the installed Electron runtime:

```powershell
$env:ELECTRON_RUN_AS_NODE = '1'
& '.\node_modules\electron\dist\electron.exe' '.\node_modules\vitest\vitest.mjs' run tests/game-data --disableConsoleIntercept
Remove-Item Env:ELECTRON_RUN_AS_NODE
```

Run that snippet in a separate terminal session or remove the variable before normal Electron commands. Do not persist it in application settings.

## Required follow-up gate

When GUI/build commands are allowed again:

```sh
npm run probe:catalog:dev
# Stop the dev process/Vite before the next commands.
npm run build
npm run probe:catalog:start
```

These opt-in probes use a main-owned scratch directory, emit `CATALOG_RUNTIME_PROBE` with worker/runtime details and reopen evidence, then exit. They do not open the normal application panel or touch calibration data. No user visual interaction is expected; Electron still starts as a desktop process. Actual dev/build results must be recorded before closing task 1.1 or proceeding to downstream catalog implementation.

## Source candidate

## Desktop inspector

Run the application and open **Каталог данных**. Select **Импорт папки bundle**, then the bundle directory (not an individual file). Cancellation leaves the active snapshot unchanged. The UI shows import duration, snapshot IDs, patch verification, unknown league applicability, source revisions/hashes and coverage. Storage errors are displayed without resetting the database.

Search **Базы** or **Модификаторы** by literal name/stable ID; class (bases only), domain and tag filters use exact source identifiers. Results are paginated in groups of 30. Select a result to inspect raw facts and warnings; base implicit links open the corresponding modifier in the same snapshot. The snapshot selector changes the active snapshot only after **Активировать**. Close the main panel to close the inspector and worker. Calibration remains independently stored.

## Storage, lookup and recovery

The worker owns schema-1 SQLite storage. Snapshots and their records are immutable; a separate active pointer changes atomically with successful import. Failed imports roll back without changing the previous active snapshot. Explicit snapshot IDs keep readers pinned across later activation. Previous snapshots are retained; there is no automatic pruning.

The public reader supports bounded literal text search, base class, domain and tag facts, pagination (1–100 results), stable-ID details and explicit activation. Modifier class/eligibility filtering is rejected rather than inferred. Search uses parameters and escapes literal `%`, `_` and backslash. Names in result lists are bounded; full original data remains in detail payloads (maximum 512 KiB per record). Ordered weight rows retain source ordinals and zero values. Unsupported/fallback details carry warnings.

`catalog-unavailable`, `unsupported-snapshot`, `not-found`, `invalid-query`, `snapshot-conflict`, `unsupported-schema` and `catalog-corrupt` are distinct error states. Corrupt, incomplete, newer-version or unversioned nonempty databases are preserved; the application never resets them automatically. Schema 1 is the first version, so no migrations are currently shipped. **Backup-before-migration policy:** any future supported schema migration must first create a restorable database backup with the writer closed (including relevant SQLite sidecars), test restoration, then migrate atomically. Unsupported schemas remain blocked until that implementation exists. For manual recovery, first close the app and copy the existing database/sidecars; do not delete the only copy or alter its user_version to bypass checks.

The real source-worker probe can be repeated without the inspector:

```sh
npm run catalog:probe-import -- tmp/catalog-bundle-v1 tmp/catalog-import-probe.sqlite
```

This diagnostic uses the explicitly named scratch database, never the app's calibration store. Initial local evidence: 3,773 ms import, 8 ms for two overview queries, 192,360,448-byte database; reopen retained the snapshot and Paua Amulet/mod/stat chain. These timings are observations, not performance guarantees. Application UI/user-data acceptance remains separate.

## Refresh and validate a pinned bundle

```sh
npm run catalog:refresh -- --revision 3ac25f0277a23296b5799e5eaa911dd46f68e6e0 --cache tmp/game-data-source --output tmp/catalog-bundle-v1
npm run catalog:validate -- tmp/catalog-bundle-v1
```

The output directory must be empty. The CLI downloads only fixed paths from an immutable 40-character revision, computes SHA-256 checksums, reuses verified cache entries, and fails on changed cache content, size limits, timeouts or HTTP errors. It does not retry spending or poll upstream. In Windows PowerShell use `npm.cmd` if npm argument forwarding differs.

A bundle contains only `manifest.json` and `records.json`. The manifest pins the game, declared patch, language, source revisions/notices/file hashes, retrieval time, coverage and the exact records checksum/length. Import validates filenames and resolved paths before reading; it rejects extra files, traversal, unsupported game/schema, invalid ranges, duplicate IDs and missing required references.

Canonical records retain source IDs, raw payloads, modifier groups and ordered weights including zeros. Unknown legacy translation stat references are listed in `missingStatIds`; they are not fabricated as stat definitions. Unnamed bases use their stable ID for display while retaining the original empty name. No recipe eligibility or probability is inferred.

The first real bundle is `poe1-3ac25f0277a2-c1e2111ca4bf`, 70,309,353 bytes, with 5,461 bases and 40,355 modifiers; 14 translation groups carry unsupported legacy references. It has passed normalization and local checksum/reference validation, but database/UI import acceptance is still pending. Full snapshots remain ignored local files. Node 24 runs the tooling through native TypeScript stripping; the advisory about typeless ES modules does not affect the Electron CommonJS output.

[Source metadata](reference/game-data-source-candidate.json) identifies the accepted initial PoE 1 export revision, declared patch, downloaded-file SHA-256 hashes and a verified base/mod/stat/English-translation chain. It is not a normalized import bundle. Git blob IDs and downloaded-file checksums are recorded separately. League compatibility and crafting eligibility/probabilities are not inferred from source acceptance.
