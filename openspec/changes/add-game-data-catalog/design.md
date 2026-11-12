# Design

## Context

See proposal.md for the missing catalog. Existing item contracts hold baseType, rarity, and modifier text only; they are not a canonical item database. Calibration JSON stores geometry and workspace settings. An in-memory probe under installed Electron 45.3.1 / Node 24.22.2 successfully loaded node:sqlite and queried SQLite 3.53.4. This verifies availability, not the future worker, persistence, or import implementation.

The user accepted a catalog stage between input/testbed and the first recipe. Assume PoE 1, English source text first, retaining identifiers for later localization. The first real recipe remains undecided and will be proposed after inspection of an accepted snapshot.

## Goals / Non-Goals

**Goals:** Reproducible source acquisition, validated offline storage, browsable raw facts, explicit coverage, and snapshot-pinned queries.

**Non-Goals:** Full support for every crafting mechanic, probability simulation, trade search, price synchronization, a server backend, full localization, scanning the player's stash, or extending the minimal item parser into a production parser in this change.

## Decisions

### RePoE export as the initial source adapter

Use [repoe-fork/repoe](https://github.com/repoe-fork/repoe) and its [hosted export index](https://repoe-fork.github.io/) as the initial source family. The older lvlvllvlvllvlvl/RePoE repository is archived and points to this successor. Pin actual data-export revisions, not merely the parser repository revision: game data and translations can come from separate export repositories. Record every contributing revision and URL in a manifest. Inspect applicable source notices and retain attribution in the developer documentation and exported manifest; code licensing alone does not establish ownership of game data.

Use a developer refresh command to fetch selected JSON files at immutable revisions with bounded downloads and descriptive request identification. Normalize them into an application bundle with a versioned manifest and hashes. Support explicit import of that local bundle through a main-owned dialog. Do not fetch mutable latest files independently and combine them into a supposed consistent release. Runtime scheduled HTTP sync is deferred; a reproducible fetch/build/import workflow is enough for this first catalog.

Initial coverage: base items (including currency bases), item classes, tags, modifiers, stat definitions, stat translations, and modifier-type data needed by imported records. Preserve unknown mechanic details as raw source payloads with coverage markers. Source-specific group identifiers become canonical group records; keep domain, generation type, essence-only flags, required levels, and ordered spawn/generation weights. A mod display name is not a unique key or a guaranteed tier. English translations may involve multiple stats; store translation payloads without pretending they are a one-to-one string table. Missing display text falls back to stable IDs with a warning.

Acceptance gate: acquire one real, mutually consistent PoE 1 bundle; verify schemas, source notices, declared patch evidence, language, and coverage; record a base and associated modifier/stat records as evidence. A source that cannot establish patch coverage can be imported as unverified for inspection, but cannot satisfy the verified real-snapshot acceptance task. If the source schema needs changes outside the adapter's planned coverage, revise this plan rather than inventing values.

Alternative: poe.ninja as the main catalog. Rejected because its [supported API](https://poe.ninja/docs/api) covers economy pricing rather than a complete crafting-rule database. Its docs also recommend a caching backend for desktop consumers. Keep optional economy data as a later adapter with league/timestamps and independent freshness; no new backend is introduced now. Alternative: hard-code a small hand-authored real-data catalog. Rejected as a source of undocumented drift; small synthetic fixtures remain appropriate for tests.

### SQLite runtime catalog, JSON source bundles

Store `game-data.sqlite` under app.getPath('userData'), separately from calibration-workspace.json. Keep JSON bundles as reproducible input artifacts, with small synthetic fixtures in Git and large real snapshots in ignored local data/cache directories. Use node:sqlite behind a repository port, with database operations in a Node worker so large imports do not block Electron's main loop. The worker receives bounded named operations; renderer code never sees SQL or filesystem paths. Verify worker loading in both dev and build/start before implementing the rest of the catalog.

Use schema-versioned tables for snapshots, sources, bases, item classes, tags, base tags, mods, mod groups/membership, stats, mod stat ranges, ordered weights, translations, and raw record payloads. Snapshot ID participates in keys and foreign keys. Index stable IDs, normalized display-name search fields, class, and domain. Use parameterized queries, bounded pages, finite values, and explicit payload/record limits. No arbitrary SQL IPC.

Alternative: load all JSON into memory at startup. Simple for fixtures but increases startup cost and makes indexed joins and atomic version management harder. Alternative: an external SQLite binding. Unnecessary while the verified bundled Node API meets the requirements. Calibration preferences remain JSON because they are small, independent, and already have recovery semantics.

### Transactional activation and recovery

Validate manifest paths, sizes, supported schema/game, hashes, unique IDs, required fields, and references before activation. Reject path traversal and unexpected files; import data only, never executable content. Build a new immutable snapshot in one transaction with foreign keys enabled, run integrity checks, then update an active-snapshot pointer in that transaction. Failed work rolls back; a previous active snapshot remains available. Recover from an interrupted first import as catalog-unavailable, not an empty valid database.

Keep prior validated snapshots for explicit selection and in-progress readers. Each query captures one snapshot ID; a future recipe will hold its ID for the run. No automatic deletion in this change. Database schema newer than supported is blocked without reset; corruption is reported with a recoverable error, preserving the file for diagnosis. A backup-before-migration policy covers later schema changes. A new league does not imply a new base-data schema: record game patch and declared league applicability separately, with unknown values explicit.

### Read-only inspector and stable query API

`features/game-data` owns manifest schemas, source normalization, query DTOs, and import orchestration. `platform` owns file dialogs, acquisition, SQLite workers, and named IPC with main-window sender checks. Public lookups use stable IDs plus snapshot ID, with bounded search/filter pages. Return catalog-unavailable, unsupported-snapshot, not-found, or invalid-query distinctly. Cross-feature code imports this public API; do not couple input to SQLite or redefine existing synthetic crafting contracts yet.

Add a small Catalog view with status/provenance, Import, snapshot selector, base search, modifier search, and raw fact details. Search is literal, bounded, and parameterized. Expose class/domain/tag filters and modifier details rather than claiming to list all valid rolls for a selected base. Full eligibility depends on crafting method and item state and belongs to the first strategy's scope. Display unsupported mechanics, unverified patches, and translation fallbacks visibly.

## Risks / Trade-offs

- Upstream schema or translation representation changes -> pinned revisions, adapter validation, raw payload retention, and explicit unsupported states.
- A downloaded file may be recent but describe an older patch -> require independent patch evidence and label unknown compatibility.
- Large imports can exhaust memory or stall UI -> worker execution, file/record limits, bounded normalization, and transactional writes; measure an actual bundle.
- Import failures can damage trust -> preserve the active snapshot, test interrupted transactions, and show source-record diagnostics.
- Data facts can be mistaken for a recipe solver -> inspector exposes facts and coverage, with no fabricated probabilities or eligibility claims.

## Migration Plan

After the agreed structure and input steps, verify SQLite worker compatibility, implement manifest/normalization tests, then transactional storage and read-only UI. Exercise a real pinned bundle before closing acceptance. No calibration migration or production parser changes. Rollback removes feature wiring while retaining the independent catalog file; earlier app versions can continue using their calibration JSON. Add a catalog ADR, import guide, code-map entries, and actual verification evidence during implementation. Stop before recipe planning until source coverage and user goals are known.
