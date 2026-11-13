# 0005: SQLite catalog worker and versioned source acceptance

**Status:** Runtime and initial source acceptance gates passed; catalog implementation follows.

## Decision

Implement the catalog behind a pure `CatalogRepository` port. Node's bundled SQLite API runs in a worker, preserving the Electron main event loop. Requests use bounded named operations, request IDs, deadlines and a maximum queue length of 16. No renderer receives SQL, database paths or worker access. Worker failures reject pending requests; shutdown also resolves ownership of the worker thread.

The initial worker deliberately contains only runtime diagnostics and an unavailable catalog status. Its diagnostic table is written only in a temporary scratch database, never `game-data.sqlite` or the calibration workspace. It is not a snapshot store, catalog importer or recipe solver.

Use electron-vite's installed `?nodeWorker` factory to bundle the worker as a separate entry. Its TypeScript declaration and generated factory were inspected locally. This still needs actual dev and build/start validation; type checking is not proof that the emitted worker starts correctly.

## Evidence so far

On 2026-11-13, seven file-backed/lifecycle tests passed under ordinary Node and under installed Electron in `ELECTRON_RUN_AS_NODE=1` mode. The latter reported Node 24.22.2, Electron 45.3.1, SQLite 3.53.4, and successful file reopen. Tests cover persistence, invalid token rejection, bounded concurrent RPC, close, startup failure, unresponsive-worker timeout and cancellation of a full queue on shutdown.

The initial pass was headless source-worker evidence only. After the user returned, actual `probe:catalog:dev` and fresh build/`probe:catalog:start` both reported success with the emitted worker: thread 1 wrote first-open and thread 2 read it after reopening. Node 24.22.2 / Electron 45.3.1 / SQLite 3.53.4 were consistent. Vite was stopped before build/start. Task 1.1 is now satisfied; source acceptance remains separate.

## Source acceptance

The initial candidate is the [RePoE PoE 1 export repository](https://github.com/repoe-fork/repoe-fork.github.io), not the parser repository alone. Candidate commit `3ac25f0277a23296b5799e5eaa911dd46f68e6e0` declares `3.29.3.6` in its pinned `exported-version.txt`; its pinned `schema.txt` identifies schema revision `9ccbbba4d40b693b1fe5d6c689d7f6ca324be312`. Reading mutable schema metadata separately returned an older revision, reinforcing the need to pin all source files together.

[Source evidence](../reference/game-data-source-candidate.json) records immutable references, Git blob IDs and separately computed SHA-256 hashes for 13 downloaded source/metadata/schema files. Direct bounded downloads resolved the connector's large-content limitation. The accepted chain is Paua Amulet -> ManaRegenerationImplicitAmulet1 -> mana_regeneration_rate_+% -> its English translation, with a source range of 20–30. Source reference checks found no missing base classes/implicit modifiers, modifier stats/types, or required tags in this snapshot.

The initial source contains 5,461 bases, 40,355 modifiers, 23,362 stats and 11,257 translation groups. Generated game data belongs to Grinding Gear Games under its terms; RePoE parser code uses a separate MIT license. Full data snapshots remain in ignored local storage. Retain these notices in import provenance. Some non-core raw fields (such as nullable gold_value) differ from the published JSON schema; preserve them as raw payloads and validate the adapter's explicit core coverage. Source acceptance is not normalized-bundle/import acceptance, league detection, or a crafting solver.

## Desktop inspector

The main panel opens a separate sandboxed inspector. Only the main panel's main frame may open it; only the registered inspector main frame may invoke catalog operations. Named IPC validates query/detail/snapshot DTOs before storage access. Imports accept no renderer path: a main-owned folder dialog supplies the bundle directory. The worker is created lazily and closes with the main panel. Navigation and new windows are denied. Search results retain their snapshot and record kind for detail links; loading and errors are visible.

The inspector displays the manifest's patch verification, unknown league compatibility, coverage, revisions and file hashes. Details retain warning messages and raw records; missing names use stable IDs. This is an inspection surface, not a crafting-eligibility solver.

## Alternatives and boundaries

## Bundle boundary

## SQLite snapshots and recovery

Use composite snapshot/record keys with foreign keys for classes, tags, types, groups, base implicits, modifier stats/groups/tags/ordered weights, and resolved translation references. Payloads retain complete normalized/raw records. Missing legacy translation references remain in payload metadata without invented stat definitions. A single transaction inserts a snapshot and its relations, validates foreign keys, then switches the active pointer. Immutable prior snapshots remain available for explicitly pinned readers.

The real worker probe imported the accepted 70,309,353-byte bundle into a 192,360,448-byte database, reopened it and resolved the Paua Amulet chain. The first local import took 3,773 ms; two overview queries took 8 ms. File-backed tests exercised genuine SQL-trigger failure, termination with an uncommitted transaction, first-import rollback, foreign-key enforcement, literal searches and snapshot conflict/selection.

Schema 1 ships no upgrade path. Unknown nonempty version-0 files, newer versions and corrupt/incomplete files are blocked and preserved. Future supported migrations require a backup/restore step before changes, with a closed writer and sidecars retained, followed by atomic migration tests. This policy avoids speculative or destructive migration code before a previous supported schema exists. Opening unsupported files was verified byte-for-byte not to rewrite them.

The bundle schema separates source provenance from normalized data checksums, retains ordered weights/raw records, and treats missing legacy translation stats as explicit unsupported references. Missing modifier stat/tag/group/type references remain fatal. Display fallback uses stable IDs for unnamed bases while preserving empty source names. Adapter ordering uses deterministic code-point key sorting.

The developer CLI runs on Node 24's TypeScript stripping, with explicit `.ts` imports and no additional runtime dependency. Type checking includes tooling. Node's typeless-module advisory is retained rather than changing the package type and breaking Electron's CommonJS main output. The filesystem adapter validates real paths, byte limits, exact file lists and hashes before parsing/import; the network adapter uses immutable revisions, fixed paths, bounded streams, timeouts and verified cache entries.

- External SQLite bindings are unnecessary while the Electron-bundled API passes its required gates.
- JSON remains appropriate for immutable source bundles and small test fixtures; the calibration settings retain their existing JSON recovery flow.
- Worker diagnostic success does not establish crafting eligibility rules. Market-price feeds and a first recipe remain outside this change.
