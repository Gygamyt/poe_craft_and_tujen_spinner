import { describe, expect, it, vi } from "vitest";
import { acceptDesktopSnapshot, saveEditedProfile } from "../src/domain/calibration-snapshot";
import { CalibrationService } from "../src/main/calibration-service";
import {
  createWorkspace,
  saveProfile,
  type CalibrationWorkspace,
} from "../src/domain/calibration-workspace";
import { profileFixture, templateFixture } from "./fixtures/calibration";
import type { DesktopState } from "../src/domain/desktop-api";

function fixture() {
  const template = templateFixture();
  const workspace = saveProfile(
    createWorkspace(template, profileFixture().display),
    profileFixture(),
    template,
  );
  const storage = {
    save: vi.fn<(workspace: CalibrationWorkspace) => Promise<void>>(async () => undefined),
    reset: vi.fn(async () => workspace),
  };
  const platform = {
    setMode: vi.fn(),
    setBounds: vi.fn(),
    chooseImport: vi.fn(async () => undefined),
    confirmReset: vi.fn(async () => false),
  };
  return {
    service: new CalibrationService(workspace, [profileFixture().display], storage, platform),
    storage,
  };
}

describe("renderer snapshot ordering", () => {
  it("ignores a late pre-gesture getState response after a successful Save", async () => {
    const { service } = fixture();
    service.edit();
    const delayedReply = service.getState();
    const draft = service.getState().profile;
    draft.inventory.x += 37.25;
    service.updateProfile(draft);
    await service.save();
    const preview = service.getState();
    expect(preview.revision).toBeGreaterThan(delayedReply.revision);
    const result = acceptDesktopSnapshot(preview, delayedReply, false);
    expect(result).toBe(preview);
    expect(result.mode).toBe("preview");
    expect(result.profile).toEqual(draft);
  });

  it("preserves a newer local drag while an older update acknowledgement arrives", () => {
    const { service } = fixture();
    service.edit();
    const local = service.getState();
    local.profile.inventory.x += 10;
    const acknowledgement = { ...service.getState(), revision: local.revision + 1 };
    expect(acceptDesktopSnapshot(local, acknowledgement, true).profile).toEqual(local.profile);
  });

  it("flushes pending work and explicitly saves the currently visible profile", async () => {
    const { service, storage } = fixture();
    service.edit();
    const visible = service.getState().profile;
    visible.inventory.x += 42.5;
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    const api = {
      updateProfile: vi.fn(async (profile) => service.updateProfile(profile)),
      save: vi.fn(async () => service.save()),
    };
    const saving = saveEditedProfile(api, pending, visible);
    expect(api.updateProfile).not.toHaveBeenCalled();
    resolve();
    await saving;
    expect(storage.save.mock.calls[0][0].profiles[0]).toEqual(visible);
    expect(service.getState().profile).toEqual(visible);
  });

  it("keeps the newest snapshot under reordered broadcasts and read responses", async () => {
    const { service } = fixture();
    const snapshots: DesktopState[] = [];
    service.onChange = () => snapshots.push(service.getState());
    service.edit();
    const draft = service.getState().profile;
    draft.inventory.x += 10;
    service.updateProfile(draft);
    await service.save();
    let current: DesktopState | undefined;
    for (const next of [...snapshots, ...snapshots.slice().reverse()])
      current = acceptDesktopSnapshot(current, next, false);
    expect(current).toEqual(service.getState());
  });
});
