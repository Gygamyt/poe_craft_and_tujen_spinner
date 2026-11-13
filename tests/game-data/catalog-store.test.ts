import { DatabaseSync } from "node:sqlite";
import { Worker } from "node:worker_threads";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep, basename } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { CatalogStore } from "../../src/platform/sqlite/catalog-store";
import { catalogFixture, manifestFixture } from "../fixtures/catalog";
import { catalogQuerySchema } from "../../src/features/game-data";
const dirs: string[] = [];
const stores: CatalogStore[] = [];
afterEach(async () => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of dirs.splice(0)) {
    if (
      !resolve(directory).startsWith(resolve(tmpdir()) + sep) ||
      !basename(directory).startsWith("poe-store-test-")
    )
      throw new Error("Unsafe cleanup path");
    await rm(directory, { recursive: true, force: true });
  }
});
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "poe-store-test-"));
  dirs.push(directory);
  const file = join(directory, "catalog.sqlite");
  const store = new CatalogStore(file);
  stores.push(store);
  return { file, store };
}
const query = (value: unknown) => catalogQuerySchema.parse(value);
it("reports source fallback and unsupported mechanic limits in details", async () => {
  const f = await fixture();
  const data = catalogFixture();
  data.bases[0].name = "base-1";
  data.bases[0].raw = { name: "" };
  data.mods[0].essenceOnly = true;
  data.mods[0].text = "";
  f.store.importSnapshot(manifestFixture(data), data);
  expect(f.store.detail("base", "base-1").warnings.join(" ")).toContain("stable ID");
  expect(f.store.detail("mod", "mod-1").warnings.join(" ")).toContain("Essence-only");
});
it("distinguishes an unavailable catalog from an empty search, persists and reopens snapshots", async () => {
  const f = await fixture();
  expect(f.store.status()).toEqual({ available: false, snapshots: [] });
  expect(() => f.store.query(query({ kind: "base" }))).toThrow("No catalog");
  const data = catalogFixture();
  f.store.importSnapshot(manifestFixture(data), data);
  f.store.close();
  const reopened = new CatalogStore(f.file);
  stores.push(reopened);
  expect(reopened.status().activeSnapshotId).toBe("fixture-1");
  expect(reopened.query(query({ kind: "base", text: "absent" })).rows).toEqual([]);
  expect(reopened.detail("mod", "mod-1").record.spawnWeights).toEqual(data.mods[0].spawnWeights);
});
it("rolls back a real SQLite failure and preserves the previous active snapshot", async () => {
  const f = await fixture();
  const data = catalogFixture();
  f.store.importSnapshot(manifestFixture(data), data);
  const external = new DatabaseSync(f.file);
  external.exec(
    "CREATE TRIGGER fail_fixture BEFORE INSERT ON mods WHEN NEW.snapshot_id='fixture-2' BEGIN SELECT RAISE(ABORT,'fixture write failure'); END",
  );
  external.close();
  expect(() => f.store.importSnapshot(manifestFixture(data, "fixture-2"), data)).toThrow(
    "fixture write failure",
  );
  expect(f.store.status().snapshots.map((row) => row.id)).toEqual(["fixture-1"]);
  expect(f.store.status().activeSnapshotId).toBe("fixture-1");
});
it("keeps a failed first import unavailable and enforces foreign keys", async () => {
  const f = await fixture();
  const external = new DatabaseSync(f.file);
  external.exec(
    "CREATE TRIGGER fail_first BEFORE INSERT ON mods BEGIN SELECT RAISE(ABORT,'fixture failure'); END",
  );
  const data = catalogFixture();
  expect(() => f.store.importSnapshot(manifestFixture(data), data)).toThrow();
  expect(f.store.status().available).toBe(false);
  external.exec("PRAGMA foreign_keys=ON");
  expect(() =>
    external.prepare("INSERT INTO base_tags VALUES(?,?,?)").run("missing", "missing", "missing"),
  ).toThrow("FOREIGN KEY");
  external.close();
});
it("recovers after a worker is terminated with an uncommitted snapshot", async () => {
  const f = await fixture();
  const data = catalogFixture();
  f.store.importSnapshot(manifestFixture(data), data);
  f.store.close();
  const worker = new Worker(
    "const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData.file);db.exec('BEGIN IMMEDIATE');db.prepare('INSERT INTO snapshots VALUES(?,?)').run('interrupted',workerData.manifest);parentPort.postMessage('staged');setInterval(()=>{},1000);",
    {
      eval: true,
      workerData: { file: f.file, manifest: JSON.stringify(manifestFixture(data, "interrupted")) },
    },
  );
  await new Promise<void>((resolve, reject) => {
    worker.once("message", () => resolve());
    worker.once("error", reject);
  });
  await worker.terminate();
  const reopened = new CatalogStore(f.file);
  stores.push(reopened);
  expect(reopened.status().snapshots.map((row) => row.id)).toEqual(["fixture-1"]);
  expect(reopened.status().activeSnapshotId).toBe("fixture-1");
});
it("keeps explicit readers pinned across activation and rejects conflicting IDs", async () => {
  const f = await fixture();
  const old = catalogFixture();
  f.store.importSnapshot(manifestFixture(old), old);
  const next = catalogFixture();
  next.bases[0].name = "New base";
  f.store.importSnapshot(manifestFixture(next, "fixture-2"), next);
  expect(f.store.query(query({ kind: "base", snapshotId: "fixture-1" })).rows[0].name).toBe(
    "Fixture Base",
  );
  expect(f.store.query(query({ kind: "base" })).rows[0].name).toBe("New base");
  f.store.activate("fixture-1");
  expect(f.store.status().activeSnapshotId).toBe("fixture-1");
  expect(() => f.store.importSnapshot(manifestFixture(next), next)).toThrow("different data");
  expect(() => f.store.activate("missing")).toThrow("Snapshot unavailable");
});
it("uses literal bounded search and fact filters without inferring mod eligibility", async () => {
  const f = await fixture();
  const data = catalogFixture();
  data.bases[0].name = "Literal 50%_base";
  f.store.importSnapshot(manifestFixture(data), data);
  expect(
    f.store.query(
      query({ kind: "base", text: "%_", tag: "default", itemClass: "class-1", domain: "item" }),
    ).total,
  ).toBe(1);
  expect(f.store.query(query({ kind: "base", text: "' OR 1=1 --" })).total).toBe(0);
  expect(f.store.query(query({ kind: "mod", tag: "blocked" })).total).toBe(1);
  expect(f.store.query(query({ kind: "base", offset: 1, limit: 1 })).rows).toEqual([]);
  expect(() => f.store.query(query({ kind: "mod", itemClass: "class-1" }))).toThrow("eligibility");
  expect(() => f.store.detail("base", "missing")).toThrow("Record unavailable");
});
it.each(["newer", "corrupt", "unversioned", "incomplete"])(
  "preserves %s database files without reset",
  async (kind) => {
    const directory = await mkdtemp(join(tmpdir(), "poe-store-test-"));
    dirs.push(directory);
    const file = join(directory, "catalog.sqlite");
    if (kind === "corrupt") await writeFile(file, "not a sqlite database");
    else {
      const db = new DatabaseSync(file);
      if (kind === "newer") db.exec("PRAGMA user_version=99");
      if (kind === "incomplete") db.exec("PRAGMA user_version=1");
      if (kind === "unversioned") db.exec("CREATE TABLE retained(value TEXT)");
      db.close();
    }
    const before = await readFile(file);
    expect(() => new CatalogStore(file)).toThrow(/preserved|newer/);
    expect(await readFile(file)).toEqual(before);
  },
);
