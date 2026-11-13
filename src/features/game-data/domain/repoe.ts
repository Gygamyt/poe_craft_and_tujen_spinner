import { validateCatalogData, type CatalogData } from "./bundle.ts";

type SourceRow = Record<string, unknown>;
export interface RePoESources {
  bases: Record<string, SourceRow>;
  mods: Record<string, SourceRow>;
  stats: Record<string, SourceRow>;
  tags: string[];
  classes: Record<string, SourceRow>;
  modTypes: Record<string, SourceRow>;
  translations: SourceRow[];
}
const rows = (source: Record<string, SourceRow>) =>
  Object.entries(source).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** Explicit core adapter; source payloads are retained without inventing missing facts. */
export function normalizeRePoE(source: RePoESources): CatalogData {
  const groups = new Set<string>();
  const mods = rows(source.mods).map(([id, value]) => {
    for (const group of value.groups as string[]) groups.add(group);
    return {
      id,
      name: value.name,
      text: value.text ?? "",
      domain: value.domain,
      generationType: value.generation_type,
      requiredLevel: value.required_level,
      essenceOnly: value.is_essence_only,
      type: value.type,
      groups: value.groups,
      tags: value.implicit_tags,
      addsTags: value.adds_tags,
      stats: value.stats,
      spawnWeights: value.spawn_weights,
      generationWeights: value.generation_weights,
      raw: value,
    };
  });
  return validateCatalogData({
    bases: rows(source.bases).map(([id, value]) => ({
      id,
      name: typeof value.name === "string" && value.name.length ? value.name : id,
      itemClass: value.item_class,
      domain: value.domain,
      dropLevel: value.drop_level,
      tags: value.tags,
      implicitMods: value.implicits,
      raw: value,
    })),
    mods,
    stats: rows(source.stats).map(([id, value]) => ({ id, isLocal: value.is_local, raw: value })),
    tags: source.tags.map((id, index) => ({ id, name: id, raw: { sourceOrdinal: index } })),
    classes: rows(source.classes).map(([id, value]) => ({
      id,
      name: typeof value.name === "string" ? value.name : id,
      raw: value,
    })),
    modTypes: rows(source.modTypes).map(([id, value]) => ({ id, name: id, raw: value })),
    groups: [...groups]
      .sort()
      .map((id) => ({ id, name: id, raw: { derivedFrom: "modifier group IDs" } })),
    translations: source.translations.map((value, index) => {
      const ids = value.ids as string[];
      return {
        id: `translation-${index.toString().padStart(6, "0")}`,
        statIds: ids,
        missingStatIds: ids.filter((id) => !Object.hasOwn(source.stats, id)),
        english: value.English ?? [],
        raw: value,
      };
    }),
  });
}
