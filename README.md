# PoE Autocraft

Electron/Vue desktop workspace for calibration, isolated input testing, and offline PoE 1 data inspection. A real crafting recipe is not implemented yet.

Requires Node 24 on Windows. Run `npm ci`, then `npm run dev`. For a production build use `npm run build` followed by `npm start`.

Open **Каталог данных** in the main panel. **Импорт папки bundle** selects a validated local bundle folder containing `manifest.json` and `records.json`. Import runs in a SQLite worker; existing snapshots remain available. Search bases/modifiers by name or stable ID and inspect raw facts, coverage, source revisions, hashes, and patch evidence. Class/domain/tag filters use exact source identifiers; the inspector does not calculate crafting eligibility or probabilities.

The catalog is stored at `%APPDATA%\auto_poe\game-data.sqlite`, independently of calibration JSON. It works offline after import. Data refresh is an explicit developer operation; see [catalog commands, attribution and recovery](docs/game-data-catalog.md).

Start code navigation with the [code map](docs/code-map.md). Verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.
