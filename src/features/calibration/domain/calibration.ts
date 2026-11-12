import { z } from "zod";

export const rectangleSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const inventorySchema = z.object({
  kind: z.literal("inventory"),
  area: rectangleSchema,
  rows: z.int().positive(),
  columns: z.int().positive(),
});

const currencyStashSchema = z.object({
  kind: z.literal("currency-stash"),
  area: rectangleSchema,
  slots: z.array(
    z.object({
      id: z.string().trim().min(1),
      bounds: rectangleSchema,
    }),
  ),
});

export const calibrationSchema = z
  .discriminatedUnion("kind", [inventorySchema, currencyStashSchema])
  .superRefine((calibration, context) => {
    if (calibration.kind === "inventory") {
      return;
    }

    const { area, slots } = calibration;
    const slotIds = new Set<string>();

    for (const [index, slot] of slots.entries()) {
      if (slotIds.has(slot.id)) {
        context.addIssue({
          code: "custom",
          path: ["slots", index, "id"],
          message: "Slot IDs must be unique",
        });
      }
      slotIds.add(slot.id);

      const { x, y, width, height } = slot.bounds;
      if (x + width > area.width || y + height > area.height) {
        context.addIssue({
          code: "custom",
          path: ["slots", index, "bounds"],
          message: "Slot must fit inside the stash area",
        });
      }
    }
  });

export type Calibration = z.infer<typeof calibrationSchema>;
