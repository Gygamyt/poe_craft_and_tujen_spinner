import { parentPort, workerData, threadId } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";
import process from "node:process";

if (!parentPort || typeof workerData?.file !== "string") {
  throw new Error("Catalog worker needs a main-owned database path");
}
const database = new DatabaseSync(workerData.file);
database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 1000;");
parentPort.on("message", (message) => {
  if (!message || !Number.isSafeInteger(message.id) || message.id < 1) return;
  try {
    let value;
    switch (message.kind) {
      case "status":
        // No catalog snapshots exist at this compatibility-gate stage.
        value = { available: false, snapshots: [] };
        break;
      case "probe": {
        if (
          typeof message.token !== "string" ||
          message.token.length < 1 ||
          message.token.length > 128
        ) {
          throw new Error("Invalid probe token");
        }
        database.exec(
          "CREATE TABLE IF NOT EXISTS __runtime_probe (id INTEGER PRIMARY KEY CHECK(id = 1), token TEXT NOT NULL)",
        );
        const previous =
          database.prepare("SELECT token FROM __runtime_probe WHERE id = 1").get()?.token ?? null;
        database
          .prepare(
            "INSERT INTO __runtime_probe(id, token) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET token = excluded.token",
          )
          .run(message.token);
        value = {
          previous,
          stored: database.prepare("SELECT token FROM __runtime_probe WHERE id = 1").get().token,
          sqlite: database.prepare("SELECT sqlite_version() AS version").get().version,
          node: process.versions.node,
          electron: process.versions.electron ?? null,
          threadId,
        };
        break;
      }
      case "close":
        database.close();
        parentPort.postMessage({ id: message.id, ok: true, value: undefined });
        parentPort.close();
        return;
      default:
        throw new Error("Unsupported catalog worker operation");
    }
    parentPort.postMessage({ id: message.id, ok: true, value });
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
