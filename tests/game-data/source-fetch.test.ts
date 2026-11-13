import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { afterEach, expect, it } from "vitest";
import { fetchPinnedSource, sourcePaths } from "../../src/platform/game-data/source-fetch";
const roots: string[] = [];
const servers: Server[] = [];
const revision = "a".repeat(40);
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  for (const root of roots.splice(0)) {
    if (
      !resolve(root).startsWith(resolve(tmpdir()) + sep) ||
      !basename(root).startsWith("poe-fetch-test-")
    )
      throw new Error("Unsafe cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
async function fixture(mode = "ok") {
  let requests = 0;
  const root = await mkdtemp(join(tmpdir(), "poe-fetch-test-"));
  roots.push(root);
  const server = createServer((request, response) => {
    requests++;
    if (mode === "hang") return;
    if (mode === "error") {
      response.writeHead(429, { "Retry-After": "60" });
      response.end();
      return;
    }
    if (mode === "large") {
      response.end("x".repeat(100));
      return;
    }
    expect(request.url).toContain(revision);
    response.end(request.url?.endsWith(".json") ? "{}" : "fixture");
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  return { root, url: `http://127.0.0.1:${address.port}`, requests: () => requests };
}
it("pins every request, records hashes and reuses verified cached files", async () => {
  const f = await fixture();
  const first = await fetchPinnedSource(revision, f.root, { baseUrl: f.url });
  expect(first.files).toHaveLength(sourcePaths.length);
  const second = await fetchPinnedSource(revision, f.root, { baseUrl: f.url });
  expect(second.files).toEqual(first.files);
  expect(f.requests()).toBe(sourcePaths.length);
});
it("rejects mutable revisions and cache tampering", async () => {
  const f = await fixture();
  await expect(fetchPinnedSource("master", f.root, { baseUrl: f.url })).rejects.toThrow(
    "Immutable",
  );
  await fetchPinnedSource(revision, f.root, { baseUrl: f.url });
  await writeFile(join(f.root, revision, "schema.txt"), "tampered");
  await expect(fetchPinnedSource(revision, f.root, { baseUrl: f.url })).rejects.toThrow("checksum");
});
it.each(["error", "large", "hang"])(
  "bounds %s responses without automatic retries",
  async (mode) => {
    const f = await fixture(mode);
    await expect(
      fetchPinnedSource(revision, f.root, { baseUrl: f.url, maxFileBytes: 32, timeout: 50 }),
    ).rejects.toThrow();
    expect(f.requests()).toBe(1);
  },
);
