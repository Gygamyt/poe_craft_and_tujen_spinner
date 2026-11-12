import { z } from "zod";
import {
  calibrationProfileSchema,
  layoutTemplateSchema,
  pageIdSchema,
  pageIds,
  parseCalibrationProfile,
  type CalibrationProfile,
  type DisplaySnapshot,
  type LayoutTemplate,
} from "./calibration-layout";

export function layoutKey(template: Pick<LayoutTemplate, "layoutId" | "geometryVersion">): string {
  return JSON.stringify([template.layoutId, template.geometryVersion]);
}

export function displayKey(display: DisplaySnapshot): string {
  const { x, y, width, height } = display.bounds;
  return JSON.stringify([display.id, x, y, width, height, display.scaleFactor, display.rotation]);
}

export function profileKey(profile: CalibrationProfile): string {
  return JSON.stringify([layoutKey(profile), displayKey(profile.display)]);
}

export function geometrySignature(template: LayoutTemplate): string {
  return JSON.stringify({
    inventory: template.inventory,
    pages: pageIds.map((page) =>
      template.pages[page].slots
        .map(({ id, bounds }) => ({ id, bounds }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    ),
  });
}

/** Returns a new catalogue; neither existing templates nor profiles are mutated. */
export function mergeTemplate(
  catalogue: readonly LayoutTemplate[],
  input: unknown,
): {
  templates: LayoutTemplate[];
  template: LayoutTemplate;
  kind: "new" | "metadata";
} {
  const template = layoutTemplateSchema.parse(input);
  const index = catalogue.findIndex((item) => layoutKey(item) === layoutKey(template));
  const templates = structuredClone([...catalogue]);
  if (index < 0) {
    templates.push(template);
    return { templates, template, kind: "new" };
  }
  if (geometrySignature(templates[index]) !== geometrySignature(template)) {
    throw new Error(
      "This geometry version already exists with different slots. Use a new geometryVersion.",
    );
  }
  templates[index] = template;
  return { templates, template, kind: "metadata" };
}

export const workspaceSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    templates: z.array(layoutTemplateSchema).min(1),
    profiles: z.array(calibrationProfileSchema),
    preferences: z.strictObject({
      layoutId: z.string().min(1),
      geometryVersion: z.string().min(1),
      displayId: z.int(),
      page: pageIdSchema,
      inventoryVisible: z.boolean(),
      stashVisible: z.boolean(),
    }),
  })
  .superRefine((workspace, context) => {
    const templates = new Map<string, LayoutTemplate>();
    for (const [index, template] of workspace.templates.entries()) {
      const key = layoutKey(template);
      if (templates.has(key))
        context.addIssue({
          code: "custom",
          path: ["templates", index],
          message: "Duplicate layout version",
        });
      templates.set(key, template);
    }
    if (!templates.has(layoutKey(workspace.preferences))) {
      context.addIssue({
        code: "custom",
        path: ["preferences"],
        message: "Selected layout version is missing",
      });
    }
    const profiles = new Set<string>();
    for (const [index, profile] of workspace.profiles.entries()) {
      const key = profileKey(profile);
      if (profiles.has(key))
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: "Duplicate calibration profile",
        });
      profiles.add(key);
      const template = templates.get(layoutKey(profile));
      try {
        if (!template) throw new Error("Calibration layout version is missing");
        parseCalibrationProfile(template, profile);
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: error instanceof Error ? error.message : "Invalid profile",
        });
      }
    }
  });

export type CalibrationWorkspace = z.infer<typeof workspaceSchema>;

export function createWorkspace(
  template: LayoutTemplate,
  display: DisplaySnapshot,
): CalibrationWorkspace {
  return workspaceSchema.parse({
    schemaVersion: 1,
    templates: [template],
    profiles: [],
    preferences: {
      layoutId: template.layoutId,
      geometryVersion: template.geometryVersion,
      displayId: display.id,
      page: "general",
      inventoryVisible: true,
      stashVisible: true,
    },
  });
}

export function saveProfile(
  workspace: CalibrationWorkspace,
  input: unknown,
  template: LayoutTemplate,
): CalibrationWorkspace {
  const profile = parseCalibrationProfile(template, input);
  const profiles = workspace.profiles.filter((item) => profileKey(item) !== profileKey(profile));
  profiles.push(profile);
  return workspaceSchema.parse({ ...workspace, profiles });
}
