import { describe, expect, it, vi } from "vitest";
import { CalibrationService } from "../src/main/calibration-service";
import {
  createWorkspace,
  layoutKey,
  saveProfile,
  type CalibrationWorkspace,
} from "../src/domain/calibration-workspace";
import { profileFixture, templateFixture } from "./fixtures/calibration";

function fixture(saved = true) {
  const template = templateFixture();
  const initial = createWorkspace(template, profileFixture().display);
  const workspace = saved ? saveProfile(initial, profileFixture(), template) : initial;
  const storage = {
    save: vi.fn<(workspace: CalibrationWorkspace) => Promise<void>>(async () => undefined),
    reset: vi.fn(async () => initial),
  };
  const platform = {
    setMode: vi.fn(),
    setBounds: vi.fn(),
    chooseImport: vi.fn(async (): Promise<unknown> => undefined),
    confirmReset: vi.fn(async () => false),
  };
  const service = new CalibrationService(workspace, [profileFixture().display], storage, platform);
  return { service, storage, platform, template, initial, workspace };
}

describe("calibration application service", () => {
  it("keeps drafts separate, cancels and saves all surfaces for restart", async () => {
    const { service, storage, platform } = fixture();
    service.edit();
    const draft = service.getState().profile;
    draft.inventory.x += 10;
    draft.pages.league.slots[0].enabled = false;
    service.updateProfile(draft);
    service.cancel();
    expect(service.getState().profile).toEqual(profileFixture());
    expect(storage.save).not.toHaveBeenCalled();
    service.edit();
    service.updateProfile(draft);
    await service.save();
    expect(service.getState()).toMatchObject({ mode: "preview", requiresCalibration: false });
    const restarted = new CalibrationService(
      storage.save.mock.calls[0][0],
      [profileFixture().display],
      storage,
      platform,
    );
    expect(restarted.getState().profile).toEqual(draft);
  });

  it("retains the editable draft and previous saved data after a write failure", async () => {
    const { service, storage, workspace } = fixture();
    storage.save.mockRejectedValueOnce(new Error("synthetic disk failure"));
    service.edit();
    const draft = service.getState().profile;
    draft.inventory.x += 10;
    service.updateProfile(draft);
    await expect(service.save()).rejects.toThrow("synthetic disk failure");
    expect(service.getState()).toMatchObject({ mode: "editing", profile: draft });
    expect(workspace.profiles[0]).toEqual(profileFixture());
    await service.save();
    expect(service.getState().mode).toBe("preview");
  });

  it("does not preview new/changed display settings until calibrated", async () => {
    const { service } = fixture(false);
    expect(() => service.preview("general")).toThrow("Save a calibration");
    service.edit();
    await service.save();
    const changed = { ...profileFixture().display, scaleFactor: 2 };
    service.refreshDisplays([changed]);
    expect(service.getState()).toMatchObject({ mode: "hidden", requiresCalibration: true });
    service.edit();
    expect(service.getState().profile.display.scaleFactor).toBe(2);
    await service.save();
    expect(service.getState().requiresCalibration).toBe(false);
  });

  it("does not show a profile if the display changes during save", async () => {
    const { service, storage } = fixture();
    let finish!: () => void;
    storage.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    service.edit();
    const saving = service.save();
    service.refreshDisplays([{ ...profileFixture().display, scaleFactor: 2 }]);
    finish();
    await saving;
    expect(service.getState()).toMatchObject({ mode: "hidden", requiresCalibration: true });
  });

  it("imports new versions only after confirmation and restores the previous version", async () => {
    const { service, platform, template } = fixture();
    const next = structuredClone(template);
    next.geometryVersion = "2";
    next.pages.general.slots[0].bounds.width = 0.5;
    platform.chooseImport.mockResolvedValueOnce(next);
    await service.chooseImport();
    expect(service.getState().templates).toHaveLength(1);
    await service.confirmImport();
    expect(service.getState().templates).toHaveLength(2);
    expect(service.getState().activeLayoutKey).toBe(layoutKey(template));
    await service.selectLayout(layoutKey(next));
    expect(service.getState().requiresCalibration).toBe(true);
    await service.selectLayout(layoutKey(template));
    expect(service.getState().profile).toEqual(profileFixture());
    expect(service.getState().requiresCalibration).toBe(false);
  });

  it("updates names without losing calibrated coordinates or enabled flags", async () => {
    const { service, platform, template } = fixture();
    service.edit();
    const draft = service.getState().profile;
    draft.pages.general.slots[0].enabled = false;
    service.updateProfile(draft);
    await service.save();
    const named = structuredClone(template);
    named.pages.general.slots[0].defaultLabel = "Named later";
    platform.chooseImport.mockResolvedValueOnce(named);
    await service.chooseImport();
    await service.confirmImport();
    expect(service.getState().profile).toEqual(draft);
    expect(service.getState().templates[0].pages.general.slots[0].defaultLabel).toBe("Named later");
  });

  it("rejects malformed imports and supports cancel without writes", async () => {
    const { service, platform, storage, template } = fixture();
    platform.chooseImport.mockResolvedValueOnce({ invalid: true });
    await expect(service.chooseImport()).rejects.toThrow();
    expect(service.getState().templates).toHaveLength(1);
    platform.chooseImport.mockResolvedValueOnce(template);
    await service.chooseImport();
    service.cancelImport();
    expect(service.getState().pendingImport).toBeUndefined();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation for recovery reset", async () => {
    const { service, platform, storage } = fixture();
    await service.reset();
    expect(storage.reset).not.toHaveBeenCalled();
    platform.confirmReset.mockResolvedValueOnce(true);
    await service.reset();
    expect(storage.reset).toHaveBeenCalledWith(true);
    expect(service.getState().requiresCalibration).toBe(true);
  });
});
