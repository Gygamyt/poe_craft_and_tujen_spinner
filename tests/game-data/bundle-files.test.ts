import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { afterEach, expect, it } from "vitest";
import { readCatalogBundle, writeCatalogBundle } from "../../src/platform/game-data/bundle-files";
import { catalogFixture, manifestFixture } from "../fixtures/catalog";
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (
      !resolve(directory).startsWith(resolve(tmpdir()) + sep) ||
      !basename(directory).startsWith("poe-bundle-test-")
    )
      throw new Error("Unsafe test cleanup path");
    await rm(directory, { recursive: true, force: true });
  }
});
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "poe-bundle-test-"));
  directories.push(directory);
  const data = catalogFixture();
  await writeCatalogBundle(directory, manifestFixture(data), data);
  return directory;
}
it("round-trips a checksummed bundle", async () => {
  const directory = await fixture();
  const value = await readCatalogBundle(directory);
  expect(value.data).toEqual(catalogFixture());
});
it("rejects tampered content and unrelated files", async () => {
  const directory = await fixture();
  await writeFile(join(directory, "records.json"), "{}");
  await expect(readCatalogBundle(directory)).rejects.toThrow("checksum");
  await writeFile(join(directory, "extra.json"), "{}");
  await expect(readCatalogBundle(directory)).rejects.toThrow("Unexpected");
});
it("rejects path traversal and refuses overwriting an existing bundle", async () => {
  const directory = await fixture();
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  manifest.files[0].path = "../records.json";
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
  await expect(readCatalogBundle(directory)).rejects.toThrow();
  await expect(writeCatalogBundle(directory, manifestFixture(), catalogFixture())).rejects.toThrow(
    "empty",
  );
});
