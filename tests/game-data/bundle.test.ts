import { expect, it } from "vitest";
import {
  validateCatalogData,
  catalogManifestSchema,
  normalizeRePoE,
} from "../../src/features/game-data";
import { catalogFixture, manifestFixture, repoEFixture } from "../fixtures/catalog";
it("accepts unknown patch metadata without calling it verified", () => {
  expect(catalogManifestSchema.parse(manifestFixture()).patchVerified).toBe(false);
  expect(() =>
    catalogManifestSchema.parse({ ...manifestFixture(), patchVerified: true }),
  ).toThrow();
});
it.each([
  { game: "poe2" },
  { schemaVersion: 2 },
  { sources: [] },
  { files: [{ path: "../records.json", bytes: 1, sha256: "b".repeat(64) }] },
])("rejects unsupported or unsafe manifests", (value) => {
  expect(() => catalogManifestSchema.parse({ ...manifestFixture(), ...value })).toThrow();
});
it.each(["duplicate", "range", "stat", "tag", "group", "class"])(
  "rejects broken %s data",
  (kind) => {
    const data = catalogFixture();
    if (kind === "duplicate") data.mods.push(structuredClone(data.mods[0]));
    if (kind === "range") data.mods[0].stats[0].min = 11;
    if (kind === "stat") data.stats = [];
    if (kind === "tag") data.tags = [];
    if (kind === "group") data.groups = [];
    if (kind === "class") data.classes = [];
    expect(() => validateCatalogData(data)).toThrow();
  },
);
it("preserves source order and zero weights and normalizes deterministically", () => {
  const source = repoEFixture();
  const first = normalizeRePoE(source);
  const second = normalizeRePoE(structuredClone(source));
  expect(first).toEqual(second);
  expect(first.mods[0].spawnWeights).toEqual([
    { tag: "blocked", weight: 0 },
    { tag: "default", weight: 100 },
  ]);
  expect(first.mods[0].name).toBe("");
  expect(first.mods[0].raw).toEqual(source.mods["mod-1"]);
});
it("uses stable IDs for unnamed bases and keeps unsupported translation references explicit", () => {
  const source = repoEFixture();
  source.bases["base-1"].name = "";
  source.translations.push({ ids: ["retired-stat"], English: null });
  const data = normalizeRePoE(source);
  expect(data.bases[0].name).toBe("base-1");
  expect(data.bases[0].raw.name).toBe("");
  expect(data.translations[1]).toMatchObject({
    statIds: ["retired-stat"],
    missingStatIds: ["retired-stat"],
    english: [],
  });
  data.translations[1].missingStatIds = [];
  expect(() => validateCatalogData(data)).toThrow("explicit");
});
