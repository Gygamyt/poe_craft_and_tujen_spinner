import { resolve } from "node:path";
import { readCatalogBundle } from "../../src/platform/game-data/bundle-files.ts";
import { reportCatalogFailure } from "./cli-error.ts";
async function main() {
  if (process.argv.length !== 3) throw new Error("Usage: catalog:validate <bundle-directory>");
  const bundle = await readCatalogBundle(resolve(process.argv[2]));
  console.log(
    JSON.stringify({
      snapshotId: bundle.manifest.snapshotId,
      bytes: bundle.manifest.files[0].bytes,
      patch: bundle.manifest.patch,
      counts: Object.fromEntries(
        Object.entries(bundle.data).map(([key, rows]) => [key, rows.length]),
      ),
      unsupportedTranslations: bundle.data.translations.filter(
        (row) => row.missingStatIds.length || !row.english.length,
      ).length,
    }),
  );
}
void main().catch(reportCatalogFailure);
