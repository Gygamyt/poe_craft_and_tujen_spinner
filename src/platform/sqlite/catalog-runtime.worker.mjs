import { parentPort, workerData, threadId } from "node:worker_threads";
import process from "node:process";
import { CatalogStore } from "./catalog-store.ts";
import { readCatalogBundle } from "../game-data/bundle-files.ts";

if (!parentPort || typeof workerData?.file !== "string")
  throw new Error("Catalog worker needs a main-owned database path");
const database = new CatalogStore(workerData.file);
let closed = false;
let chain = Promise.resolve();
parentPort.on("message", (message) => {
  chain = chain.then(() => handle(message));
});
async function handle(message) {
  if (!message || !Number.isSafeInteger(message.id) || message.id < 1 || closed) return;
  try {
    let value;
    switch (message.kind) {
      case "status":
        value = database.status();
        break;
      case "probe":
        value = {
          ...database.probe(message.token),
          node: process.versions.node,
          electron: process.versions.electron ?? null,
          threadId,
        };
        break;
      case "import": {
        if (typeof message.payload?.directory !== "string")
          throw new Error("Invalid main-owned bundle directory");
        const bundle = await readCatalogBundle(message.payload.directory);
        value = database.importSnapshot(bundle.manifest, bundle.data);
        break;
      }
      case "query":
        value = database.query(message.payload);
        break;
      case "detail":
        value = database.detail(
          message.payload?.kind,
          message.payload?.id,
          message.payload?.snapshotId,
        );
        break;
      case "activate":
        if (typeof message.payload?.snapshotId !== "string") throw new Error("Invalid snapshot");
        value = database.activate(message.payload.snapshotId);
        break;
      case "close":
        database.close();
        closed = true;
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
      error: (error instanceof Error ? error.message : String(error)).slice(0, 2500),
      code: error?.code ?? "invalid-catalog-operation",
    });
  }
}
