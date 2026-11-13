import { z } from "zod";
const seed = z.int().min(0).max(0xffffffff);
export const testbedCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("run"),
    targetId: z.string().max(100),
    button: z.enum(["primary", "secondary"]),
    shift: z.boolean(),
    seed,
  }),
  z.strictObject({ kind: z.literal("page"), page: z.enum(["general", "atlas", "league"]) }),
  z.strictObject({ kind: z.literal("reset"), seed }),
  z.strictObject({
    kind: z.literal("toggle"),
    targetId: z.string().max(100),
    enabled: z.boolean(),
  }),
  z.strictObject({ kind: z.literal("fault"), fault: z.enum(["none", "delayed", "missing"]) }),
  z.strictObject({ kind: z.literal("stop") }),
  z.strictObject({ kind: z.literal("export") }),
  z.strictObject({ kind: z.literal("suite") }),
]);
export const observedEventSchema = z.strictObject({
  type: z.enum(["pointermove", "pointerdown", "pointerup", "keydown", "keyup"]),
  x: z.number().finite(),
  y: z.number().finite(),
  button: z.number().int(),
  shift: z.boolean(),
  key: z.string().max(12),
  trusted: z.boolean(),
  runId: z.int().nonnegative(),
  epoch: z.int().positive(),
});
