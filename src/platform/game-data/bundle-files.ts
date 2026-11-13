import { readFile, stat, realpath, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  catalogManifestSchema,
  validateCatalogData,
  type CatalogData,
  type CatalogManifest,
} from "../../features/game-data/index.ts";

export const sha256 = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
export async function readCatalogBundle(
  directory: string,
): Promise<{ manifest: CatalogManifest; data: CatalogData }> {
  const root = await realpath(directory);
  const names = await readdir(root);
  if (names.some((name) => !["manifest.json", "records.json"].includes(name)))
    throw new Error("Unexpected bundle file");
  const read = async (name: string, max: number) => {
    const file = await realpath(join(root, name));
    if (dirname(file) !== root) throw new Error("Bundle path escapes selected directory");
    const info = await stat(file);
    if (!info.isFile() || info.size > max) throw new Error("Bundle file size/type limit");
    const bytes = await readFile(file);
    if (bytes.length > max) throw new Error("Bundle grew beyond size limit");
    return bytes;
  };
  const manifest = catalogManifestSchema.parse(
    JSON.parse((await read("manifest.json", 1024 * 1024)).toString("utf8")),
  );
  const expected = manifest.files[0];
  const bytes = await read(expected.path, 256 * 1024 * 1024);
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256)
    throw new Error("Bundle checksum mismatch");
  return { manifest, data: validateCatalogData(JSON.parse(bytes.toString("utf8"))) };
}

export async function writeCatalogBundle(
  directory: string,
  manifest: CatalogManifest,
  data: CatalogData,
) {
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length) throw new Error("Bundle output must be empty");
  const bytes = JSON.stringify(data);
  if (
    manifest.files[0].bytes !== Buffer.byteLength(bytes) ||
    manifest.files[0].sha256 !== sha256(bytes)
  )
    throw new Error("Invalid output checksum");
  catalogManifestSchema.parse(manifest);
  await writeFile(join(directory, "records.json"), bytes, { flag: "wx" });
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), {
    flag: "wx",
  });
}
