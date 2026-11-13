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

[Source metadata](reference/game-data-source-candidate.json) identifies the accepted initial PoE 1 export revision, declared patch, downloaded-file SHA-256 hashes and a verified base/mod/stat/English-translation chain. It is not a normalized import bundle. Git blob IDs and downloaded-file checksums are recorded separately. League compatibility and crafting eligibility/probabilities are not inferred from source acceptance.
