import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import { SqliteRuntimeClient } from "../../src/platform/sqlite/runtime-client.ts";
import { reportCatalogFailure } from "./cli-error.ts";
async function main() {
  if (process.argv.length !== 4)
    throw new Error("Usage: catalog:probe-import <bundle-directory> <scratch-database>");
  const directory = resolve(process.argv[2]),
    file = resolve(process.argv[3]);
  const create = () =>
    new SqliteRuntimeClient(
      new Worker(new URL("../../src/platform/sqlite/catalog-runtime.worker.mjs", import.meta.url), {
        workerData: { file },
      }),
      30000,
    );
  let client = create();
  try {
    const started = performance.now();
    const imported = await client.importDirectory(directory);
    const importMs = performance.now() - started;
    const queryStarted = performance.now();
    const bases = await client.query({ kind: "base", text: "", offset: 0, limit: 1 });
    const mods = await client.query({ kind: "mod", text: "", offset: 0, limit: 1 });
    const queryMs = performance.now() - queryStarted;
    const base = await client.detail("base", "Metadata/Items/Amulets/Amulet1");
    const mod = await client.detail("mod", (base.record.implicitMods as string[])[0]);
    await client.close();
    client = create();
    const reopened = await client.status();
    if (
      reopened.activeSnapshotId !== imported.activeSnapshotId ||
      base.record.name !== "Paua Amulet"
    )
      throw new Error("Real import/reopen evidence failed");
    console.log(
      JSON.stringify({
        ok: true,
        snapshotId: reopened.activeSnapshotId,
        importMs: Math.round(importMs),
        twoQueriesMs: Math.round(queryMs),
        databaseBytes: (await stat(file)).size,
        counts: { bases: bases.total, mods: mods.total },
        evidence: { base: base.record.id, modifier: mod.record.id, stats: mod.record.stats },
        reopened: true,
      }),
    );
  } finally {
    await client.close();
  }
}
void main().catch(reportCatalogFailure);
