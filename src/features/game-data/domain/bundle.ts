import { z } from "zod";

const id = z.string().min(1).max(300);
const raw = z.record(z.string(), z.unknown());
const named = z.strictObject({ id, name: z.string(), raw });
const weight = z.strictObject({ tag: id, weight: z.number().finite().nonnegative() });
const range = z
  .strictObject({ id, min: z.number().finite(), max: z.number().finite() })
  .refine((value) => value.min <= value.max, "Reversed stat range");
export const catalogDataSchema = z.strictObject({
  bases: z
    .array(
      z.strictObject({
        id,
        name: z.string().min(1),
        itemClass: id,
        domain: id,
        dropLevel: z.int().nonnegative(),
        tags: z.array(id),
        implicitMods: z.array(id),
        raw,
      }),
    )
    .max(100000),
  mods: z
    .array(
      z.strictObject({
        id,
        name: z.string(),
        text: z.string(),
        domain: id,
        generationType: id,
        requiredLevel: z.int().nonnegative(),
        essenceOnly: z.boolean(),
        type: id,
        groups: z.array(id),
        tags: z.array(id),
        addsTags: z.array(id),
        stats: z.array(range),
        spawnWeights: z.array(weight),
        generationWeights: z.array(weight),
        raw,
      }),
    )
    .max(200000),
  stats: z.array(z.strictObject({ id, isLocal: z.boolean(), raw })).max(200000),
  tags: z.array(named).max(100000),
  classes: z.array(named).max(10000),
  modTypes: z.array(named).max(100000),
  groups: z.array(named).max(100000),
  translations: z
    .array(
      z.strictObject({
        id,
        statIds: z.array(id),
        missingStatIds: z.array(id),
        english: z.array(raw),
        raw,
      }),
    )
    .max(100000),
});
export const catalogManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    snapshotId: id,
    game: z.literal("poe1"),
    patch: z.string().min(1).nullable(),
    patchVerified: z.boolean(),
    league: z.string().min(1).nullable(),
    language: z.literal("English"),
    retrievedAt: z.iso.datetime(),
    sources: z
      .array(
        z.strictObject({
          repository: id,
          revision: z.string().regex(/^[0-9a-f]{40}$/),
          url: z.url().refine((value) => value.startsWith("https://")),
          attribution: z.string().min(1),
          files: z
            .array(
              z.strictObject({
                path: z.string().min(1).max(200),
                bytes: z.int().nonnegative(),
                sha256: z.string().regex(/^[0-9a-f]{64}$/),
              }),
            )
            .min(1)
            .max(32),
        }),
      )
      .min(1)
      .max(16),
    coverage: z.array(z.string().min(1).max(500)).min(1).max(100),
    files: z
      .array(
        z.strictObject({
          path: z.literal("records.json"),
          bytes: z
            .int()
            .positive()
            .max(256 * 1024 * 1024),
          sha256: z.string().regex(/^[0-9a-f]{64}$/),
        }),
      )
      .length(1),
  })
  .refine(
    (value) => !value.patchVerified || value.patch !== null,
    "A verified patch needs evidence",
  );
export type CatalogData = z.infer<typeof catalogDataSchema>;
export type CatalogManifest = z.infer<typeof catalogManifestSchema>;

export function validateCatalogData(input: unknown): CatalogData {
  const data = catalogDataSchema.parse(input);
  const sets = Object.fromEntries(
    Object.entries(data).map(([kind, rows]) => {
      const ids = new Set<string>();
      for (const row of rows) {
        if (ids.has(row.id)) throw new Error(`${kind}/${row.id}: duplicate ID`);
        ids.add(row.id);
      }
      return [kind, ids];
    }),
  ) as Record<keyof CatalogData, Set<string>>;
  const requireId = (kind: keyof CatalogData, value: string, owner: string) => {
    if (!sets[kind].has(value)) throw new Error(`${owner}: missing ${kind}/${value}`);
  };
  for (const base of data.bases) {
    requireId("classes", base.itemClass, base.id);
    for (const tag of base.tags) requireId("tags", tag, base.id);
    for (const mod of base.implicitMods) requireId("mods", mod, base.id);
  }
  for (const mod of data.mods) {
    requireId("modTypes", mod.type, mod.id);
    for (const stat of mod.stats) requireId("stats", stat.id, mod.id);
    for (const group of mod.groups) requireId("groups", group, mod.id);
    for (const tag of [
      ...mod.tags,
      ...mod.addsTags,
      ...mod.spawnWeights.map((x) => x.tag),
      ...mod.generationWeights.map((x) => x.tag),
    ])
      requireId("tags", tag, mod.id);
  }
  for (const translation of data.translations) {
    const missing = translation.statIds.filter((value) => !sets.stats.has(value));
    if (
      new Set(translation.missingStatIds).size !== missing.length ||
      missing.some((value) => !translation.missingStatIds.includes(value))
    )
      throw new Error(`${translation.id}: unsupported translation references must be explicit`);
  }
  return data;
}

export const catalogQuerySchema = z.strictObject({
  snapshotId: id.optional(),
  kind: z.enum(["base", "mod"]),
  text: z.string().max(200).default(""),
  itemClass: id.optional(),
  domain: id.optional(),
  tag: id.optional(),
  offset: z.int().nonnegative().max(1000000).default(0),
  limit: z.int().min(1).max(100).default(30),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
