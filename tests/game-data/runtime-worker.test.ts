import { Worker } from "node:worker_threads";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { SqliteRuntimeClient } from "../../src/platform/sqlite/runtime-client";
import { verifySqliteWorker } from "../../src/platform/sqlite/runtime-probe";

const workerUrl = new URL("../../src/platform/sqlite/catalog-runtime.worker.mjs", import.meta.url);
const clients: SqliteRuntimeClient[] = [];
const files: { directory: string; file: string }[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const { directory, file } of files.splice(0)) {
    await unlink(file).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await rmdir(directory);
  }
});
async function open() {
  const directory = await mkdtemp(join(tmpdir(), "poe-catalog-test-"));
  const file = join(directory, "runtime.sqlite");
  files.push({ directory, file });
  const client = new SqliteRuntimeClient(new Worker(workerUrl, { workerData: { file } }));
  clients.push(client);
  return { client, file };
}
it("loads SQLite in a real worker, persists, closes and reopens its file", async () => {
  const result = await verifySqliteWorker(
    (file) => new Worker(workerUrl, { workerData: { file } }),
    tmpdir(),
  );
  expect(result.first.previous).toBeNull();
  expect(result.reopened.previous).toBe("first-open");
  expect(result.reopened.stored).toBe("reopened");
  expect(result.first.threadId).toBeGreaterThan(0);
  expect(result.first.sqlite).toMatch(/^\d+\.\d+\.\d+$/);
  expect(result.first.electron).toBe(process.versions.electron ?? null);
  expect(result.status).toEqual({ available: false, snapshots: [] });
  console.info(
    "CATALOG_WORKER_TEST_RUNTIME",
    JSON.stringify({
      node: result.first.node,
      electron: result.first.electron,
      sqlite: result.first.sqlite,
      reopened: true,
    }),
  );
});
it("rejects invalid tokens without losing the worker connection", async () => {
  const { client } = await open();
  await expect(client.probe("x".repeat(129))).rejects.toThrow("Invalid probe token");
  expect((await client.probe("valid")).stored).toBe("valid");
});
it("isolates concurrent replies and enforces a bounded request queue", async () => {
  const { client } = await open();
  const requests = Array.from({ length: 16 }, () => client.status());
  await expect(client.status()).rejects.toThrow("queue is full");
  const result = await Promise.all(requests);
  expect(result.every((item) => !item.available)).toBe(true);
});
it("closes idempotently and rejects work after closure", async () => {
  const { client } = await open();
  await client.close();
  await client.close();
  await expect(client.status()).rejects.toThrow("closed");
});
it("rejects pending calls when the worker fails during startup", async () => {
  const worker = new Worker("throw new Error('fixture startup failure')", { eval: true });
  const client = new SqliteRuntimeClient(worker);
  clients.push(client);
  await expect(client.status()).rejects.toThrow("fixture startup failure");
});
it("terminates an unresponsive worker at its request deadline", async () => {
  const worker = new Worker("setInterval(() => {},1000)", { eval: true });
  const client = new SqliteRuntimeClient(worker, 50);
  clients.push(client);
  await expect(client.status()).rejects.toThrow("deadline exceeded");
  await expect(client.status()).rejects.toThrow("closed");
});

it("cancels a full queue on close without leaving unresolved requests", async () => {
  const worker = new Worker("setInterval(() => {},1000)", { eval: true });
  const client = new SqliteRuntimeClient(worker);
  clients.push(client);
  const pending = Promise.allSettled(Array.from({ length: 16 }, () => client.status()));
  await client.close();
  expect((await pending).every((result) => result.status === "rejected")).toBe(true);
});
