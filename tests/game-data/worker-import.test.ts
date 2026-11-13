import { Worker } from "node:worker_threads";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { afterEach, expect, it } from "vitest";
import { SqliteRuntimeClient } from "../../src/platform/sqlite/runtime-client";
import { writeCatalogBundle } from "../../src/platform/game-data/bundle-files";
import { catalogFixture, manifestFixture } from "../fixtures/catalog";
const clients: SqliteRuntimeClient[] = [];
const dirs: string[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const directory of dirs.splice(0)) {
    if (
      !resolve(directory).startsWith(resolve(tmpdir()) + sep) ||
      !basename(directory).startsWith("poe-worker-import-")
    )
      throw new Error("Unsafe cleanup path");
    await rm(directory, { recursive: true, force: true });
  }
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "poe-worker-import-"));
  dirs.push(root);
  const bundle = join(root, "bundle");
  const data = catalogFixture();
  await writeCatalogBundle(bundle, manifestFixture(data), data);
  const client = new SqliteRuntimeClient(
    new Worker(new URL("../../src/platform/sqlite/catalog-runtime.worker.mjs", import.meta.url), {
      workerData: { file: join(root, "catalog.sqlite") },
    }),
  );
  clients.push(client);
  return { client, bundle, root };
}
it("imports through the real worker and exposes bounded query/detail results", async () => {
  const f = await fixture();
  await expect(
    f.client.query({ kind: "base", text: "", offset: 0, limit: 1 }),
  ).rejects.toMatchObject({ code: "catalog-unavailable" });
  await f.client.importDirectory(f.bundle);
  expect(
    (await f.client.query({ kind: "base", text: "Fixture", offset: 0, limit: 1 })).rows,
  ).toHaveLength(1);
  expect((await f.client.detail("mod", "mod-1")).record.stats).toEqual([
    { id: "stat-1", min: 1, max: 10 },
  ]);
  await expect(f.client.detail("base", "missing")).rejects.toMatchObject({ code: "not-found" });
});
it("keeps the active snapshot and calibration file unchanged on failed import", async () => {
  const f = await fixture();
  const calibration = join(f.root, "calibration-workspace.json");
  await writeFile(calibration, '{"userGeometry":"retained"}');
  await f.client.importDirectory(f.bundle);
  await writeFile(join(f.bundle, "records.json"), "{}");
  await expect(f.client.importDirectory(f.bundle)).rejects.toThrow("checksum");
  expect((await f.client.status()).activeSnapshotId).toBe("fixture-1");
  expect(await readFile(calibration, "utf8")).toBe('{"userGeometry":"retained"}');
});
it("resolves dimensions from legacy raw payloads and pins them across activation", async () => {
  const f = await fixture();
  await expect(f.client.dimensions("base-1")).rejects.toMatchObject({
    code: "catalog-unavailable",
  });
  await f.client.importDirectory(f.bundle);
  expect(await f.client.dimensions("base-1")).toMatchObject({
    status: "unknown",
    snapshotId: "fixture-1",
  });
  const data = catalogFixture();
  data.bases[0].raw = { inventory_width: 2, inventory_height: 3 };
  const next = join(f.root, "next");
  await writeCatalogBundle(next, manifestFixture(data, "fixture-2"), data);
  await f.client.importDirectory(next);
  expect(await f.client.dimensions("base-1")).toMatchObject({
    status: "known",
    width: 2,
    height: 3,
  });
  expect(await f.client.dimensions("base-1", "fixture-1")).toMatchObject({ status: "unknown" });
  await expect(f.client.dimensions("absent")).rejects.toMatchObject({ code: "not-found" });
  await expect(f.client.dimensions("base-1", "absent")).rejects.toMatchObject({
    code: "unsupported-snapshot",
  });
});
