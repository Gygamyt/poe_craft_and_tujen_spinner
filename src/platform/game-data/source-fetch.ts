import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { sha256 } from "./bundle-files.ts";

export const sourcePaths = [
  "exported-version.txt",
  "schema.txt",
  "data/base_items.json",
  "data/mods.json",
  "data/stats.json",
  "data/tags.json",
  "data/item_classes.json",
  "data/mod_types.json",
  "data/stat_translations.json",
] as const;
export interface SourceFile {
  path: string;
  bytes: number;
  sha256: string;
}

export async function fetchPinnedSource(
  revision: string,
  cache: string,
  options: {
    baseUrl?: string;
    timeout?: number;
    maxFileBytes?: number;
    fetcher?: typeof fetch;
  } = {},
) {
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error("Immutable source revision required");
  const base =
    options.baseUrl ?? "https://raw.githubusercontent.com/repoe-fork/repoe-fork.github.io";
  const root = join(cache, revision);
  await mkdir(root, { recursive: true });
  const files: SourceFile[] = [];
  const payloads: Record<string, Buffer> = {};
  let total = 0;
  let previous: { revision: string; files: SourceFile[] } | undefined;
  try {
    previous = JSON.parse(await readFile(join(root, "source-files.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const path of sourcePaths) {
    const old =
      previous?.revision === revision
        ? previous.files.find((file) => file.path === path)
        : undefined;
    let bytes: Buffer;
    if (old) {
      if ((await stat(join(root, path))).size > (options.maxFileBytes ?? 96 * 1024 * 1024))
        throw new Error("Cached source file size limit");
      bytes = await readFile(join(root, path));
      if (bytes.length !== old.bytes || sha256(bytes) !== old.sha256)
        throw new Error(`Cache checksum mismatch: ${path}`);
    } else {
      const response = await (options.fetcher ?? fetch)(`${base}/${revision}/${path}`, {
        headers: { "User-Agent": "PoE-Autocraft-game-data/1.0" },
        redirect: "error",
        signal: AbortSignal.timeout(options.timeout ?? 30000),
      });
      if (!response.ok)
        throw new Error(
          `Source HTTP ${response.status}: ${path}; Retry-After=${response.headers.get("retry-after") ?? "none"}`,
        );
      if (!response.body) throw new Error("Empty source response");
      const chunks: Uint8Array[] = [];
      let length = 0;
      const limit = options.maxFileBytes ?? 96 * 1024 * 1024;
      if (Number(response.headers.get("content-length")) > limit) {
        await response.body.cancel();
        throw new Error("Source file size limit");
      }
      const reader = response.body.getReader();
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          length += next.value.length;
          if (length > limit) throw new Error("Source file size limit");
          chunks.push(next.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      bytes = Buffer.concat(chunks);
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), bytes);
    }
    total += bytes.length;
    if (total > 256 * 1024 * 1024) throw new Error("Source bundle size limit");
    if (path.endsWith(".json")) JSON.parse(bytes.toString("utf8"));
    files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
    payloads[path] = bytes;
  }
  await writeFile(join(root, "source-files.json"), JSON.stringify({ revision, files }, null, 2));
  return { files, payloads };
}
