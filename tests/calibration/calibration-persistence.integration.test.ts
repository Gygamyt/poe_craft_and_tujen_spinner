import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CalibrationService } from "../../src/features/calibration/application/calibration-service";
import { WorkspaceStore } from "../../src/platform/electron/calibration/workspace-store";
import {
  createWorkspace,
  layoutKey,
} from "../../src/features/calibration/domain/calibration-workspace";
import { profileFixture, templateFixture } from "../fixtures/calibration";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

it("persists named slots and parallel geometry versions, restores old profiles and recovers a corrupt file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "poe-calibration-integration-"));
  directories.push(directory);
  const file = join(directory, "workspace.json");
  const template = templateFixture();
  const display = profileFixture().display;
  const initial = createWorkspace(template, display);
  const store = new WorkspaceStore(file, initial);
  const platform = {
    setMode: vi.fn(),
    setBounds: vi.fn(),
    chooseImport: vi.fn<() => Promise<unknown>>(async () => undefined),
    confirmReset: vi.fn(async () => true),
  };
  const service = new CalibrationService(await store.load(), [display], store, platform);
  service.edit();
  const calibrated = service.getState().profile;
  calibrated.pages.general.slots[0].enabled = false;
  calibrated.inventory.x -= 10.25;
  service.updateProfile(calibrated);
  await service.save();

  const restarted = new CalibrationService(
    await new WorkspaceStore(file, initial).load(),
    [display],
    store,
    platform,
  );
  expect(restarted.getState().profile).toEqual(calibrated);
  const named = structuredClone(template);
  named.pages.general.slots[0].defaultLabel = "Added later";
  platform.chooseImport.mockResolvedValueOnce(named);
  await restarted.chooseImport();
  await restarted.confirmImport();
  expect((await store.load()).profiles[0]).toEqual(calibrated);

  const next = structuredClone(named);
  next.geometryVersion = "2";
  next.pages.general.slots[0].bounds.width = 0.5;
  platform.chooseImport.mockResolvedValueOnce(next);
  await restarted.chooseImport();
  await restarted.confirmImport();
  await restarted.selectLayout(layoutKey(next));
  expect(restarted.getState().requiresCalibration).toBe(true);
  restarted.edit();
  await restarted.save();
  await restarted.selectLayout(layoutKey(template));
  expect(restarted.getState().profile).toEqual(calibrated);
  const disk = await store.load();
  expect(disk.profiles).toHaveLength(2);
  expect(disk.templates[0].pages.general.slots[0].defaultLabel).toBe("Added later");

  await writeFile(file, "synthetic corruption");
  const recoveryStore = new WorkspaceStore(file, initial);
  await expect(recoveryStore.load()).rejects.toThrow("original file is preserved");
  const recovery = new CalibrationService(
    initial,
    [display],
    recoveryStore,
    platform,
    "Cannot load calibration data",
  );
  recovery.edit();
  await expect(recovery.save()).rejects.toThrow("confirmed reset");
  expect(await readFile(file, "utf8")).toBe("synthetic corruption");
  recovery.cancel();
  await recovery.reset();
  expect(recovery.getState().recoveryRequired).toBe(false);
  expect(await recoveryStore.load()).toEqual(initial);
  const backup = (await readdir(directory)).find((name) => name.includes(".recovery-"))!;
  expect(await readFile(join(directory, backup), "utf8")).toBe("synthetic corruption");
});
