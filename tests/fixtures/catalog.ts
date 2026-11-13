import type { CatalogData, CatalogManifest, RePoESources } from "../../src/features/game-data";
import { sha256 } from "../../src/platform/game-data/bundle-files";
export function catalogFixture(): CatalogData {
  return {
    bases: [
      {
        id: "base-1",
        name: "Fixture Base",
        itemClass: "class-1",
        domain: "item",
        dropLevel: 1,
        tags: ["default"],
        implicitMods: ["mod-1"],
        raw: {},
      },
    ],
    mods: [
      {
        id: "mod-1",
        name: "",
        text: "Fixture +#",
        domain: "item",
        generationType: "prefix",
        requiredLevel: 1,
        essenceOnly: false,
        type: "type-1",
        groups: ["group-1"],
        tags: [],
        addsTags: [],
        stats: [{ id: "stat-1", min: 1, max: 10 }],
        spawnWeights: [
          { tag: "blocked", weight: 0 },
          { tag: "default", weight: 100 },
        ],
        generationWeights: [],
        raw: {},
      },
    ],
    stats: [{ id: "stat-1", isLocal: false, raw: {} }],
    tags: [
      { id: "blocked", name: "blocked", raw: {} },
      { id: "default", name: "default", raw: {} },
    ],
    classes: [{ id: "class-1", name: "Fixture class", raw: {} }],
    modTypes: [{ id: "type-1", name: "type-1", raw: {} }],
    groups: [{ id: "group-1", name: "group-1", raw: {} }],
    translations: [
      {
        id: "translation-000000",
        statIds: ["stat-1"],
        missingStatIds: [],
        english: [{ string: "Fixture {0}" }],
        raw: {},
      },
    ],
  };
}
export function manifestFixture(
  data = catalogFixture(),
  snapshotId = "fixture-1",
): CatalogManifest {
  const text = JSON.stringify(data);
  return {
    schemaVersion: 1,
    snapshotId,
    game: "poe1",
    patch: null,
    patchVerified: false,
    league: null,
    language: "English",
    retrievedAt: "2026-11-13T00:00:00.000Z",
    sources: [
      {
        repository: "fixture/source",
        revision: "a".repeat(40),
        url: "https://example.invalid/fixture",
        attribution: "Synthetic test data",
        files: [{ path: "fixture.json", bytes: 2, sha256: "b".repeat(64) }],
      },
    ],
    coverage: ["Synthetic fixture only"],
    files: [{ path: "records.json", bytes: Buffer.byteLength(text), sha256: sha256(text) }],
  };
}
export function repoEFixture(): RePoESources {
  return {
    bases: {
      "base-1": {
        name: "Fixture Base",
        item_class: "class-1",
        domain: "item",
        drop_level: 1,
        tags: ["default"],
        implicits: ["mod-1"],
      },
    },
    mods: {
      "mod-1": {
        name: "",
        text: "Fixture +#",
        domain: "item",
        generation_type: "prefix",
        required_level: 1,
        is_essence_only: false,
        type: "type-1",
        groups: ["group-1"],
        implicit_tags: [],
        adds_tags: [],
        stats: [{ id: "stat-1", min: 1, max: 10 }],
        spawn_weights: [
          { tag: "blocked", weight: 0 },
          { tag: "default", weight: 100 },
        ],
        generation_weights: [],
      },
    },
    stats: { "stat-1": { is_local: false } },
    tags: ["blocked", "default"],
    classes: { "class-1": { name: "Fixture class" } },
    modTypes: { "type-1": {} },
    translations: [{ ids: ["stat-1"], English: [{ string: "Fixture {0}" }] }],
  };
}
