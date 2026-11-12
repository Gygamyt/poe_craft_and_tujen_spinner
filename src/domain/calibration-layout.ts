import { z } from "zod";
import { calibrationSchema, rectangleSchema } from "./calibration";

export const pageIds = ["general", "atlas", "league"] as const;
export const pageIdSchema = z.enum(pageIds);
const identifier = z.string().trim().min(1);

export const normalizedRectangleSchema = rectangleSchema.superRefine((bounds, context) => {
  if (bounds.x + bounds.width > 1 || bounds.y + bounds.height > 1) {
    context.addIssue({ code: "custom", message: "Slot must fit inside the unit rectangle" });
  }
});

const slotSchema = z.object({
  id: identifier,
  bounds: normalizedRectangleSchema,
  defaultLabel: z.string().trim().min(1).optional(),
});

function uniqueIds(value: { slots: { id: string }[] }, context: z.RefinementCtx): void {
  const ids = new Set<string>();
  value.slots.forEach((slot, index) => {
    if (ids.has(slot.id)) {
      context.addIssue({
        code: "custom",
        path: ["slots", index, "id"],
        message: "Slot IDs must be unique within a page",
      });
    }
    ids.add(slot.id);
  });
}

const pageTemplateSchema = z.object({ slots: z.array(slotSchema).min(1) }).superRefine(uniqueIds);

export const layoutTemplateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  layoutId: identifier,
  geometryVersion: identifier,
  leagueLabel: z.string().trim().min(1).optional(),
  inventory: z.strictObject({ columns: z.literal(12), rows: z.literal(5) }),
  pages: z.strictObject({
    general: pageTemplateSchema,
    atlas: pageTemplateSchema,
    league: pageTemplateSchema,
  }),
});

export const displaySnapshotSchema = z.object({
  id: z.int(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  scaleFactor: z.number().positive(),
  rotation: z.int().min(0).max(359),
});

const calibratedPageSchema = z
  .object({
    area: rectangleSchema,
    slots: z.array(
      z.object({ id: identifier, bounds: normalizedRectangleSchema, enabled: z.boolean() }),
    ),
  })
  .superRefine(uniqueIds);

export const calibrationProfileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    layoutId: identifier,
    geometryVersion: identifier,
    display: displaySnapshotSchema,
    inventory: rectangleSchema,
    pages: z.strictObject({
      general: calibratedPageSchema,
      atlas: calibratedPageSchema,
      league: calibratedPageSchema,
    }),
  })
  .superRefine((profile, context) => {
    const surfaces = [
      { path: ["inventory"], area: profile.inventory },
      ...pageIds.map((id) => ({ path: ["pages", id, "area"], area: profile.pages[id].area })),
    ];
    for (const { path, area } of surfaces) {
      if (
        area.x + area.width > profile.display.bounds.width ||
        area.y + area.height > profile.display.bounds.height
      ) {
        context.addIssue({ code: "custom", path, message: "Area must fit inside the display" });
      }
    }
  });

export type Rectangle = z.infer<typeof rectangleSchema>;
export type PageId = z.infer<typeof pageIdSchema>;
export type LayoutTemplate = z.infer<typeof layoutTemplateSchema>;
export type DisplaySnapshot = z.infer<typeof displaySnapshotSchema>;
export type CalibrationProfile = z.infer<typeof calibrationProfileSchema>;

export function slotLabel(slot: { id: string; defaultLabel?: string }): string {
  return slot.defaultLabel ?? `Slot ${slot.id.replace(/^slot-0*/, "") || slot.id}`;
}

/** Validate references as well as geometry before accepting a profile at a boundary. */
export function parseCalibrationProfile(
  template: LayoutTemplate,
  input: unknown,
): CalibrationProfile {
  const profile = calibrationProfileSchema.parse(input);
  if (
    profile.layoutId !== template.layoutId ||
    profile.geometryVersion !== template.geometryVersion
  ) {
    throw new Error("Calibration belongs to a different layout geometry");
  }
  calibrationSchema.parse({
    kind: "inventory",
    area: profile.inventory,
    ...template.inventory,
  });
  for (const page of pageIds) {
    const expected = new Set(template.pages[page].slots.map((slot) => slot.id));
    const actual = profile.pages[page];
    if (
      actual.slots.length !== expected.size ||
      actual.slots.some((slot) => !expected.has(slot.id))
    ) {
      throw new Error(`Calibration slot IDs do not match page ${page}`);
    }
    calibrationSchema.parse({
      kind: "currency-stash",
      area: actual.area,
      slots: actual.slots.map((slot) => ({
        id: slot.id,
        bounds: {
          x: slot.bounds.x * actual.area.width,
          y: slot.bounds.y * actual.area.height,
          width: slot.bounds.width * actual.area.width,
          height: slot.bounds.height * actual.area.height,
        },
      })),
    });
  }
  return profile;
}
