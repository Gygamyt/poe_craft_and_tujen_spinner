import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WorkspaceStore } from "../../src/platform/electron/calibration/workspace-store";
import {
  createWorkspace,
  saveProfile,
} from "../../src/features/calibration/domain/calibration-workspace";
import { profileFixture, templateFixture } from "../fixtures/calibration";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await fs.rm(directory, { recursive: true, force: true });
});

async function fixture() {
  const directory = await fs.mkdtemp(join(tmpdir(), "poe-calibration-test-"));
  directories.push(directory);
  const file = join(directory, "calibration.json");
  const initial = createWorkspace(templateFixture(), profileFixture().display);
  return { file, initial, directory };
}

describe("workspace storage", () => {
  it("saves all surfaces and serializes concurrent writes", async () => {
    const { file, initial } = await fixture();
    const store = new WorkspaceStore(file, initial);
    expect(await store.load()).toEqual(initial);
    const first = saveProfile(initial, profileFixture(), templateFixture());
    const second = structuredClone(first);
    second.profiles[0].pages.league.slots[0].enabled = false;
    await Promise.all([store.save(first), store.save(second)]);
    expect(await new WorkspaceStore(file, initial).load()).toEqual(second);
  });

  it("preserves the previous file and input draft when replacement fails", async () => {
    const { file, initial, directory } = await fixture();
    const store = new WorkspaceStore(file, initial);
    await store.load();
    await store.save(initial);
    const original = await fs.readFile(file, "utf8");
    const failing = new WorkspaceStore(file, initial, {
      ...fs,
      rename: vi.fn(async () => {
        throw new Error("synthetic disk failure");
      }),
    });
    await failing.load();
    const draft = saveProfile(initial, profileFixture(), templateFixture());
    await expect(failing.save(draft)).rejects.toThrow("synthetic disk failure");
    expect(await fs.readFile(file, "utf8")).toBe(original);
    expect(draft.profiles[0]).toEqual(profileFixture());
    expect(await fs.readdir(directory)).toEqual(["calibration.json"]);
  });

  it.each(["not JSON", JSON.stringify({ schemaVersion: 99 })])(
    "blocks writes to unreadable data until a confirmed reset (%s)",
    async (content) => {
      const { file, initial, directory } = await fixture();
      await fs.writeFile(file, content);
      const store = new WorkspaceStore(file, initial);
      await expect(store.load()).rejects.toThrow("original file is preserved");
      await expect(store.save(initial)).rejects.toThrow("confirmed reset");
      await expect(store.reset(false)).rejects.toThrow("confirmation");
      expect(await fs.readFile(file, "utf8")).toBe(content);
      expect(await store.reset(true)).toEqual(initial);
      const backup = (await fs.readdir(directory)).find((name) => name.includes(".recovery-"))!;
      expect(await fs.readFile(join(directory, backup), "utf8")).toBe(content);
      expect(await store.load()).toEqual(initial);
    },
  );
});
