import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  catalogManifestSchema,
  catalogQuerySchema,
  validateCatalogData,
  type CatalogManifest,
  type CatalogQuery,
} from "../../features/game-data/index.ts";
import type {
  CatalogStatus,
  CatalogQueryResult,
  CatalogDetail,
} from "../../features/game-data/contracts.ts";

export class CatalogStorageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
const namedTables = [
  "classes",
  "tags",
  "mod_types",
  "mod_groups",
  "stats",
  "translations",
] as const;
const schema = `
BEGIN IMMEDIATE;
CREATE TABLE snapshots(id TEXT PRIMARY KEY, manifest TEXT NOT NULL);
CREATE TABLE active_snapshot(singleton INTEGER PRIMARY KEY CHECK(singleton=1), snapshot_id TEXT NOT NULL REFERENCES snapshots(id));
${namedTables.map((table) => `CREATE TABLE ${table}(snapshot_id TEXT NOT NULL REFERENCES snapshots(id),id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(snapshot_id,id));`).join("\n")}
CREATE TABLE mods(snapshot_id TEXT NOT NULL REFERENCES snapshots(id),id TEXT NOT NULL,name TEXT NOT NULL,search_name TEXT NOT NULL,domain TEXT NOT NULL,mod_type TEXT NOT NULL,required_level INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(snapshot_id,id),FOREIGN KEY(snapshot_id,mod_type) REFERENCES mod_types(snapshot_id,id));
CREATE TABLE bases(snapshot_id TEXT NOT NULL REFERENCES snapshots(id),id TEXT NOT NULL,name TEXT NOT NULL,search_name TEXT NOT NULL,domain TEXT NOT NULL,item_class TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(snapshot_id,id),FOREIGN KEY(snapshot_id,item_class) REFERENCES classes(snapshot_id,id));
CREATE TABLE base_tags(snapshot_id TEXT NOT NULL,base_id TEXT NOT NULL,tag TEXT NOT NULL,PRIMARY KEY(snapshot_id,base_id,tag),FOREIGN KEY(snapshot_id,base_id) REFERENCES bases(snapshot_id,id),FOREIGN KEY(snapshot_id,tag) REFERENCES tags(snapshot_id,id));
CREATE TABLE base_implicits(snapshot_id TEXT NOT NULL,base_id TEXT NOT NULL,mod_id TEXT NOT NULL,ordinal INTEGER NOT NULL,PRIMARY KEY(snapshot_id,base_id,ordinal),FOREIGN KEY(snapshot_id,base_id) REFERENCES bases(snapshot_id,id),FOREIGN KEY(snapshot_id,mod_id) REFERENCES mods(snapshot_id,id));
CREATE TABLE modifier_stats(snapshot_id TEXT NOT NULL,mod_id TEXT NOT NULL,stat_id TEXT NOT NULL,ordinal INTEGER NOT NULL,min REAL NOT NULL,max REAL NOT NULL CHECK(min<=max),PRIMARY KEY(snapshot_id,mod_id,ordinal),FOREIGN KEY(snapshot_id,mod_id) REFERENCES mods(snapshot_id,id),FOREIGN KEY(snapshot_id,stat_id) REFERENCES stats(snapshot_id,id));
CREATE TABLE modifier_groups(snapshot_id TEXT NOT NULL,mod_id TEXT NOT NULL,group_id TEXT NOT NULL,PRIMARY KEY(snapshot_id,mod_id,group_id),FOREIGN KEY(snapshot_id,mod_id) REFERENCES mods(snapshot_id,id),FOREIGN KEY(snapshot_id,group_id) REFERENCES mod_groups(snapshot_id,id));
CREATE TABLE modifier_tags(snapshot_id TEXT NOT NULL,mod_id TEXT NOT NULL,tag TEXT NOT NULL,role TEXT NOT NULL,ordinal INTEGER NOT NULL,PRIMARY KEY(snapshot_id,mod_id,role,ordinal),FOREIGN KEY(snapshot_id,mod_id) REFERENCES mods(snapshot_id,id),FOREIGN KEY(snapshot_id,tag) REFERENCES tags(snapshot_id,id));
CREATE TABLE modifier_weights(snapshot_id TEXT NOT NULL,mod_id TEXT NOT NULL,kind TEXT NOT NULL,ordinal INTEGER NOT NULL,tag TEXT NOT NULL,weight REAL NOT NULL CHECK(weight>=0),PRIMARY KEY(snapshot_id,mod_id,kind,ordinal),FOREIGN KEY(snapshot_id,mod_id) REFERENCES mods(snapshot_id,id),FOREIGN KEY(snapshot_id,tag) REFERENCES tags(snapshot_id,id));
CREATE TABLE translation_stats(snapshot_id TEXT NOT NULL,translation_id TEXT NOT NULL,stat_id TEXT NOT NULL,PRIMARY KEY(snapshot_id,translation_id,stat_id),FOREIGN KEY(snapshot_id,translation_id) REFERENCES translations(snapshot_id,id),FOREIGN KEY(snapshot_id,stat_id) REFERENCES stats(snapshot_id,id));
CREATE INDEX bases_search ON bases(snapshot_id,search_name);
CREATE INDEX bases_class ON bases(snapshot_id,item_class);
CREATE INDEX mods_domain ON mods(snapshot_id,domain);
CREATE INDEX mods_search ON mods(snapshot_id,search_name);
CREATE INDEX base_tag_lookup ON base_tags(snapshot_id,tag,base_id);
CREATE INDEX modifier_tag_lookup ON modifier_tags(snapshot_id,tag,mod_id);
CREATE INDEX modifier_weight_lookup ON modifier_weights(snapshot_id,tag,mod_id);
PRAGMA user_version=1;
COMMIT;`;

export class CatalogStore {
  private database!: DatabaseSync;
  private closed = false;
  constructor(file: string) {
    try {
      this.database = new DatabaseSync(file);
      const version = Number(this.database.prepare("PRAGMA user_version").get()!.user_version);
      if (version > 1)
        throw new CatalogStorageError(
          "unsupported-schema",
          `Catalog schema ${version} is newer than supported schema 1`,
        );
      if (version === 0) {
        const existing = this.database
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          .all();
        if (existing.length)
          throw new CatalogStorageError(
            "unsupported-schema",
            "Unversioned nonempty database preserved; no automatic reset/migration",
          );
        this.database.exec(schema);
      }
      this.database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;");
      const tables = new Set(
        this.database
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all()
          .map((row) => String(row.name)),
      );
      if (
        [
          "snapshots",
          "active_snapshot",
          "bases",
          "mods",
          ...namedTables,
          "base_tags",
          "base_implicits",
          "modifier_stats",
          "modifier_groups",
          "modifier_tags",
          "modifier_weights",
          "translation_stats",
        ].some((name) => !tables.has(name))
      )
        throw new CatalogStorageError(
          "catalog-corrupt",
          "Catalog schema is incomplete; file preserved",
        );
      const result = this.database.prepare("PRAGMA quick_check").get();
      if (result?.quick_check !== "ok")
        throw new CatalogStorageError(
          "catalog-corrupt",
          "Catalog integrity check failed; file preserved",
        );
    } catch (error) {
      try {
        this.database?.close();
      } catch {
        /* Preserve the original failure. */
      }
      if (error instanceof CatalogStorageError) throw error;
      throw new CatalogStorageError(
        /not a database|malformed|corrupt/i.test(
          error instanceof Error ? error.message : String(error),
        )
          ? "catalog-corrupt"
          : "catalog-unavailable",
        `Cannot open catalog; file preserved: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  close() {
    if (!this.closed) {
      this.database.close();
      this.closed = true;
    }
  }
  private manifest(id: string): CatalogManifest {
    const row = this.database.prepare("SELECT manifest FROM snapshots WHERE id=?").get(id);
    if (!row) throw new CatalogStorageError("unsupported-snapshot", `Snapshot unavailable: ${id}`);
    try {
      return catalogManifestSchema.parse(JSON.parse(String(row.manifest)));
    } catch {
      throw new CatalogStorageError(
        "catalog-corrupt",
        `Invalid metadata in snapshot ${id}; file preserved`,
      );
    }
  }
  private snapshot(id?: string): string {
    if (id) {
      this.manifest(id);
      return id;
    }
    const row = this.database
      .prepare("SELECT snapshot_id FROM active_snapshot WHERE singleton=1")
      .get();
    if (!row)
      throw new CatalogStorageError(
        "catalog-unavailable",
        "No catalog snapshot has been activated",
      );
    return String(row.snapshot_id);
  }
  status(): CatalogStatus {
    const snapshots = this.database
      .prepare("SELECT id FROM snapshots ORDER BY id")
      .all()
      .map((row) => {
        const manifest = this.manifest(String(row.id));
        return {
          id: manifest.snapshotId,
          game: manifest.game,
          patch: manifest.patch,
          verified: manifest.patchVerified,
        };
      });
    const active = this.database
      .prepare("SELECT snapshot_id FROM active_snapshot WHERE singleton=1")
      .get();
    return active
      ? {
          available: true,
          snapshots,
          activeSnapshotId: String(active.snapshot_id),
          activeManifest: this.manifest(String(active.snapshot_id)),
        }
      : { available: false, snapshots };
  }
  activate(id: string) {
    this.manifest(id);
    this.database
      .prepare(
        "INSERT INTO active_snapshot(singleton,snapshot_id) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET snapshot_id=excluded.snapshot_id",
      )
      .run(id);
    return this.status();
  }
  importSnapshot(manifestInput: unknown, dataInput: unknown) {
    const manifest = catalogManifestSchema.parse(manifestInput);
    const data = validateCatalogData(dataInput);
    const sid = manifest.snapshotId;
    const payload = (row: unknown) => {
      const text = JSON.stringify(row);
      if (Buffer.byteLength(text) > 512 * 1024)
        throw new CatalogStorageError("invalid-bundle", "Record exceeds bounded detail size");
      return text;
    };
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.database.prepare("SELECT manifest FROM snapshots WHERE id=?").get(sid);
      if (previous) {
        const existing = this.manifest(sid);
        if (
          existing.files[0].sha256 !== manifest.files[0].sha256 ||
          existing.patch !== manifest.patch ||
          existing.patchVerified !== manifest.patchVerified ||
          existing.league !== manifest.league ||
          JSON.stringify(existing.sources) !== JSON.stringify(manifest.sources)
        )
          throw new CatalogStorageError(
            "snapshot-conflict",
            "Snapshot ID already identifies different data/provenance",
          );
      } else {
        this.database
          .prepare("INSERT INTO snapshots VALUES(?,?)")
          .run(sid, JSON.stringify(manifest));
        const insertNamed = (table: (typeof namedTables)[number], rows: { id: string }[]) => {
          const statement = this.database.prepare(`INSERT INTO ${table} VALUES(?,?,?)`);
          for (const row of rows) statement.run(sid, row.id, payload(row));
        };
        insertNamed("classes", data.classes);
        insertNamed("tags", data.tags);
        insertNamed("mod_types", data.modTypes);
        insertNamed("mod_groups", data.groups);
        insertNamed("stats", data.stats);
        insertNamed("translations", data.translations);
        const modInsert = this.database.prepare("INSERT INTO mods VALUES(?,?,?,?,?,?,?,?)");
        const statInsert = this.database.prepare("INSERT INTO modifier_stats VALUES(?,?,?,?,?,?)");
        const groupInsert = this.database.prepare("INSERT INTO modifier_groups VALUES(?,?,?)");
        const tagInsert = this.database.prepare("INSERT INTO modifier_tags VALUES(?,?,?,?,?)");
        const weightInsert = this.database.prepare(
          "INSERT INTO modifier_weights VALUES(?,?,?,?,?,?)",
        );
        for (const row of data.mods) {
          const name = row.name || row.text || row.id;
          modInsert.run(
            sid,
            row.id,
            name.slice(0, 500),
            `${name} ${row.id}`.toLowerCase(),
            row.domain,
            row.type,
            row.requiredLevel,
            payload(row),
          );
          row.stats.forEach((stat, index) =>
            statInsert.run(sid, row.id, stat.id, index, stat.min, stat.max),
          );
          for (const group of new Set(row.groups)) groupInsert.run(sid, row.id, group);
          row.tags.forEach((tag, index) => tagInsert.run(sid, row.id, tag, "implicit", index));
          row.addsTags.forEach((tag, index) => tagInsert.run(sid, row.id, tag, "added", index));
          for (const [kind, weights] of [
            ["spawn", row.spawnWeights],
            ["generation", row.generationWeights],
          ] as const)
            weights.forEach((weight, index) =>
              weightInsert.run(sid, row.id, kind, index, weight.tag, weight.weight),
            );
        }
        const baseInsert = this.database.prepare("INSERT INTO bases VALUES(?,?,?,?,?,?,?)");
        const baseTagInsert = this.database.prepare("INSERT INTO base_tags VALUES(?,?,?)");
        const implicitInsert = this.database.prepare("INSERT INTO base_implicits VALUES(?,?,?,?)");
        for (const row of data.bases) {
          baseInsert.run(
            sid,
            row.id,
            row.name.slice(0, 500),
            `${row.name} ${row.id}`.toLowerCase(),
            row.domain,
            row.itemClass,
            payload(row),
          );
          for (const tag of new Set(row.tags)) baseTagInsert.run(sid, row.id, tag);
          row.implicitMods.forEach((mod, index) => implicitInsert.run(sid, row.id, mod, index));
        }
        const translationInsert = this.database.prepare(
          "INSERT INTO translation_stats VALUES(?,?,?)",
        );
        for (const row of data.translations)
          for (const id of new Set(row.statIds))
            if (!row.missingStatIds.includes(id)) translationInsert.run(sid, row.id, id);
      }
      const broken = this.database.prepare("PRAGMA foreign_key_check").get();
      if (broken) throw new CatalogStorageError("invalid-bundle", "Foreign key validation failed");
      this.activate(sid);
      this.database.exec("COMMIT");
      return this.status();
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  query(input: CatalogQuery): CatalogQueryResult {
    const query = catalogQuerySchema.parse(input);
    const sid = this.snapshot(query.snapshotId);
    const table = query.kind === "base" ? "bases" : "mods";
    const clauses = ["e.snapshot_id=?"];
    const values: SQLInputValue[] = [sid];
    if (query.kind === "mod" && query.itemClass)
      throw new CatalogStorageError(
        "invalid-query",
        "Class filtering applies to bases; modifier eligibility is not inferred",
      );
    if (query.text) {
      clauses.push("e.search_name LIKE ? ESCAPE '\\'");
      values.push(`%${query.text.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`);
    }
    if (query.domain) {
      clauses.push("e.domain=?");
      values.push(query.domain);
    }
    if (query.itemClass) {
      clauses.push("e.item_class=?");
      values.push(query.itemClass);
    }
    if (query.tag) {
      if (query.kind === "base") {
        clauses.push(
          "EXISTS(SELECT 1 FROM base_tags t WHERE t.snapshot_id=e.snapshot_id AND t.base_id=e.id AND t.tag=?)",
        );
        values.push(query.tag);
      } else {
        clauses.push(
          "(EXISTS(SELECT 1 FROM modifier_tags t WHERE t.snapshot_id=e.snapshot_id AND t.mod_id=e.id AND t.tag=?) OR EXISTS(SELECT 1 FROM modifier_weights w WHERE w.snapshot_id=e.snapshot_id AND w.mod_id=e.id AND w.tag=?))",
        );
        values.push(query.tag, query.tag);
      }
    }
    const where = clauses.join(" AND ");
    const total = Number(
      this.database
        .prepare(`SELECT count(*) AS count FROM ${table} e WHERE ${where}`)
        .get(...values)!.count,
    );
    const extra =
      query.kind === "base" ? "item_class AS itemClass" : "required_level AS requiredLevel";
    const rows = this.database
      .prepare(
        `SELECT id,name,domain,${extra} FROM ${table} e WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`,
      )
      .all(...values, query.limit, query.offset) as unknown as CatalogQueryResult["rows"];
    return { snapshotId: sid, total, rows };
  }
  detail(kind: "base" | "mod", id: string, snapshotId?: string): CatalogDetail {
    if (!["base", "mod"].includes(kind) || !id || id.length > 300)
      throw new CatalogStorageError("invalid-query", "Invalid detail query");
    const sid = this.snapshot(snapshotId);
    const table = kind === "base" ? "bases" : "mods";
    const row = this.database
      .prepare(`SELECT payload FROM ${table} WHERE snapshot_id=? AND id=?`)
      .get(sid, id);
    if (!row) throw new CatalogStorageError("not-found", `Record unavailable: ${id}`);
    const record = this.decodeRecord(String(row.payload), id);
    const warnings: string[] = [];
    if (record.name === id && (record.raw as Record<string, unknown>)?.name === "")
      warnings.push("Source name unavailable; displaying stable ID.");
    if (kind === "mod") {
      if (!record.text) warnings.push("English modifier display text is unavailable.");
      if (record.essenceOnly)
        warnings.push("Essence-only modifier. Crafting eligibility is not evaluated.");
      const translations = this.database
        .prepare(
          "SELECT DISTINCT t.id,t.payload FROM translations t JOIN translation_stats ts ON ts.snapshot_id=t.snapshot_id AND ts.translation_id=t.id JOIN modifier_stats ms ON ms.snapshot_id=ts.snapshot_id AND ms.stat_id=ts.stat_id WHERE ms.snapshot_id=? AND ms.mod_id=? ORDER BY t.id LIMIT 21",
        )
        .all(sid, id);
      if (
        translations.some(
          (value) => (JSON.parse(String(value.payload)).missingStatIds as string[]).length,
        )
      )
        warnings.push("Linked translation data contains unsupported legacy stat references.");
      if (translations.length > 20)
        warnings.push("Translation inspection is bounded; additional links are not displayed.");
    }
    return {
      snapshotId: sid,
      kind,
      record,
      coverage: this.manifest(sid).coverage,
      warnings,
    };
  }
  private decodeRecord(value: string, id: string): Record<string, unknown> {
    try {
      return JSON.parse(value);
    } catch {
      throw new CatalogStorageError("catalog-corrupt", `Invalid record ${id}; file preserved`);
    }
  }
  probe(token: string) {
    if (typeof token !== "string" || !token.length || token.length > 128)
      throw new Error("Invalid probe token");
    this.database.exec(
      "CREATE TABLE IF NOT EXISTS __runtime_probe(id INTEGER PRIMARY KEY CHECK(id=1),token TEXT NOT NULL)",
    );
    const previous =
      this.database.prepare("SELECT token FROM __runtime_probe WHERE id=1").get()?.token ?? null;
    this.database
      .prepare(
        "INSERT INTO __runtime_probe VALUES(1,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token",
      )
      .run(token);
    return {
      previous,
      stored: this.database.prepare("SELECT token FROM __runtime_probe WHERE id=1").get()!.token,
      sqlite: this.database.prepare("SELECT sqlite_version() AS version").get()!.version,
    };
  }
}
