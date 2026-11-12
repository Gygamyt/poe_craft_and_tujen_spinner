import { z } from "zod";
import { itemSchema } from "./item-parser";

const identifierSchema = z.string().trim().min(1);

export const craftRequestSchema = z.object({
  item: itemSchema,
  goalId: identifierSchema,
  currencyLimits: z.record(identifierSchema, z.int().nonnegative()),
});

export type CraftRequest = z.infer<typeof craftRequestSchema>;

export interface CraftIntent {
  item: CraftRequest["item"];
  currencyId: string;
}

export type CraftPlanResult =
  | { ok: true; intents: readonly CraftIntent[] }
  | { ok: false; reason: "insufficient-budget" | "unsupported-goal" };

export interface CraftingEngine {
  plan(request: CraftRequest): CraftPlanResult;
}
