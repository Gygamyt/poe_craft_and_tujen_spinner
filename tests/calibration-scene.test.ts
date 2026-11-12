import { expect, it, vi } from "vitest";
import { buildCalibrationScene } from "../src/domain/calibration-scene";
import { CalibrationService } from "../src/main/calibration-service";
import { createWorkspace, saveProfile } from "../src/domain/calibration-workspace";
import { profileFixture, templateFixture } from "./fixtures/calibration";

function stateFixture() {
  const template = templateFixture();
  template.pages.general.slots[0].defaultLabel = "Future name";
  const profile = profileFixture();
  const workspace = saveProfile(createWorkspace(template, profile.display), profile, template);
  return new CalibrationService(
    workspace,
    [profile.display],
    { save: vi.fn(), reset: vi.fn() },
    { setMode: vi.fn(), setBounds: vi.fn(), chooseImport: vi.fn(), confirmReset: vi.fn() },
  ).getState();
}

it("uses identical positions and labels for enabled cells in editing and preview", () => {
  const state = stateFixture();
  const editing = buildCalibrationScene({ ...state, mode: "editing" });
  const preview = buildCalibrationScene({ ...state, mode: "preview" });
  expect(preview).toEqual(editing);
  expect(preview.slots[0].label).toBe("Future name");
  expect(preview.inventory).toHaveLength(60);
});

it("keeps disabled slots visible only in editing and respects surface visibility", () => {
  const state = stateFixture();
  state.profile.pages.general.slots[0].enabled = false;
  expect(buildCalibrationScene({ ...state, mode: "editing" }).slots).toHaveLength(1);
  expect(buildCalibrationScene({ ...state, mode: "preview" }).slots).toHaveLength(0);
  expect(buildCalibrationScene({ ...state, inventoryVisible: false, stashVisible: false })).toEqual(
    { inventory: [], slots: [] },
  );
});
