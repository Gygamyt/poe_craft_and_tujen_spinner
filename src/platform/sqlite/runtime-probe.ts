import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import type { Worker } from "node:worker_threads";
import { SqliteRuntimeClient } from "./runtime-client";

/** Scratch-file compatibility test only; never opens the user's catalog or calibration. */
export async function verifySqliteWorker(
  createWorker: (file: string) => Worker,
  scratchRoot: string,
) {
  const directory = await mkdtemp(join(scratchRoot, "poe-sqlite-probe-"));
  const file = join(directory, "runtime.sqlite");
  let client: SqliteRuntimeClient | undefined;
  try {
    client = new SqliteRuntimeClient(createWorker(file));
    const first = await client.probe("first-open");
    if (first.previous !== null || first.stored !== "first-open" || first.threadId <= 0)
      throw new Error("Invalid initial worker probe");
    await client.close();
    client = new SqliteRuntimeClient(createWorker(file));
    const reopened = await client.probe("reopened");
    if (reopened.previous !== "first-open" || reopened.stored !== "reopened")
      throw new Error("Worker persistence check failed");
    const status = await client.status();
    return { first, reopened, status };
  } finally {
    await client?.close();
    // Fixed, main-owned scratch paths; no recursive delete or user-data reset.
    await unlink(file).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await rmdir(directory);
  }
}
