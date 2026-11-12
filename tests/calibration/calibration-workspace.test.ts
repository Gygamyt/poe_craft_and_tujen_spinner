import { describe, expect, it } from "vitest";
import {
  createWorkspace,
  mergeTemplate,
  saveProfile,
  workspaceSchema,
} from "../../src/features/calibration/domain/calibration-workspace";
import { profileFixture, templateFixture } from "../fixtures/calibration";

describe("layout catalogue", () => {
  it("updates labels without changing calibration identity or enabled flags", () => {
    const template = templateFixture();
    const profile = profileFixture();
    profile.pages.general.slots[0].enabled = false;
    const workspace = saveProfile(createWorkspace(template, profile.display), profile, template);
    const named = structuredClone(template);
    named.pages.general.slots[0].defaultLabel = "Future label";
    const merged = mergeTemplate(workspace.templates, named);
    const result = workspaceSchema.parse({ ...workspace, templates: merged.templates });
    expect(merged.kind).toBe("metadata");
    expect(result.profiles).toEqual(workspace.profiles);
    expect(template.pages.general.slots[0].defaultLabel).toBeUndefined();
  });

  it("ignores slot order when comparing geometry", () => {
    const template = templateFixture();
    template.pages.general.slots = [
      { id: "slot-001", bounds: { x: 0, y: 0, width: 0.5, height: 1 } },
      { id: "slot-002", bounds: { x: 0.5, y: 0, width: 0.5, height: 1 } },
    ];
    const reordered = structuredClone(template);
    reordered.pages.general.slots.reverse();
    expect(mergeTemplate([template], reordered).kind).toBe("metadata");
  });

  it("rejects geometry conflicts and adds new versions beside old profiles", () => {
    const template = templateFixture();
    const changed = structuredClone(template);
    changed.pages.general.slots[0].bounds.width = 0.5;
    expect(() => mergeTemplate([template], changed)).toThrow("geometryVersion");
    changed.geometryVersion = "2";
    const workspace = saveProfile(
      createWorkspace(template, profileFixture().display),
      profileFixture(),
      template,
    );
    const merged = mergeTemplate(workspace.templates, changed);
    const result = workspaceSchema.parse({ ...workspace, templates: merged.templates });
    expect(result.templates).toHaveLength(2);
    expect(result.preferences.geometryVersion).toBe("1");
    expect(result.profiles[0]).toEqual(profileFixture());
  });

  it("rejects malformed imports, orphan profiles and duplicate versions", () => {
    expect(() => mergeTemplate([templateFixture()], { schemaVersion: 99 })).toThrow();
    const workspace = createWorkspace(templateFixture(), profileFixture().display);
    expect(
      workspaceSchema.safeParse({ ...workspace, templates: [templateFixture(), templateFixture()] })
        .success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        ...workspace,
        profiles: [{ ...profileFixture(), geometryVersion: "missing" }],
      }).success,
    ).toBe(false);
  });
});
