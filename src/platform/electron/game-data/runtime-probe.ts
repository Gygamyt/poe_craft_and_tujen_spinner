import { app } from "electron";
import CatalogWorker from "../../sqlite/catalog-runtime.worker.mjs?nodeWorker";
import { verifySqliteWorker } from "../../sqlite/runtime-probe";

export async function runCatalogRuntimeProbe() {
  const result = await verifySqliteWorker(
    (file) => CatalogWorker({ workerData: { file } }),
    app.getPath("temp"),
  );
  console.info(
    "CATALOG_RUNTIME_PROBE",
    JSON.stringify({
      ok: true,
      mode: process.env.ELECTRON_RENDERER_URL ? "dev" : "build",
      ...result,
    }),
  );
}
