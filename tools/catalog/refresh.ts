import { resolve } from "node:path";
import {
  normalizeRePoE,
  catalogManifestSchema,
  type RePoESources,
} from "../../src/features/game-data/index.ts";
import { fetchPinnedSource } from "../../src/platform/game-data/source-fetch.ts";
import { sha256, writeCatalogBundle } from "../../src/platform/game-data/bundle-files.ts";

import { reportCatalogFailure } from "./cli-error.ts";
async function main() {
  const args = process.argv.slice(2);
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--revision", "--cache", "--output"].includes(args[i]) || !args[i + 1])
      throw new Error(
        "Use --revision <40-char-sha> --cache <directory> --output <empty-directory>",
      );
    values[args[i]] = args[i + 1];
  }
  const revision = values["--revision"];
  if (!revision) throw new Error("--revision is required");
  const source = await fetchPinnedSource(
    revision,
    resolve(values["--cache"] ?? "tmp/game-data-source"),
  );
  const read = (name: string) => JSON.parse(source.payloads[`data/${name}.json`].toString("utf8"));
  const input: RePoESources = {
    bases: read("base_items"),
    mods: read("mods"),
    stats: read("stats"),
    tags: read("tags"),
    classes: read("item_classes"),
    modTypes: read("mod_types"),
    translations: read("stat_translations"),
  };
  const data = normalizeRePoE(input);
  const bytes = JSON.stringify(data);
  const hash = sha256(bytes);
  const patch = source.payloads["exported-version.txt"].toString("utf8").trim();
  const manifest = catalogManifestSchema.parse({
    schemaVersion: 1,
    snapshotId: `poe1-${revision.slice(0, 12)}-${hash.slice(0, 12)}`,
    game: "poe1",
    patch: patch || null,
    patchVerified: Boolean(patch),
    league: null,
    language: "English",
    retrievedAt: new Date().toISOString(),
    sources: [
      {
        repository: "repoe-fork/repoe-fork.github.io",
        revision,
        url: `https://github.com/repoe-fork/repoe-fork.github.io/tree/${revision}`,
        attribution:
          "Generated game data: Grinding Gear Games, subject to its terms. RePoE parser code: MIT, separate ownership.",
        files: source.files,
      },
    ],
    coverage: [
      "Raw base/mod/stat/tag/class/type/group facts; ordered weights preserved.",
      "English translation payloads retained. Legacy references to absent stats are explicitly marked unsupported.",
      "No league detection, recipe eligibility, inferred tiers or crafting probabilities.",
    ],
    files: [{ path: "records.json", bytes: Buffer.byteLength(bytes), sha256: hash }],
  });
  const output = resolve(values["--output"] ?? `tmp/catalog-bundles/${manifest.snapshotId}`);
  await writeCatalogBundle(output, manifest, data);
  console.log(
    JSON.stringify({
      output,
      snapshotId: manifest.snapshotId,
      bytes: manifest.files[0].bytes,
      counts: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
    }),
  );
}
void main().catch(reportCatalogFailure);
