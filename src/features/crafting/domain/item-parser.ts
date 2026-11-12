import { z } from "zod";

export const itemSchema = z.object({
  baseType: z.string().trim().min(1),
  rarity: z.string().trim().min(1),
  modifiers: z.array(z.string().trim().min(1)),
});

export type Item = z.infer<typeof itemSchema>;

export type ItemParseResult =
  { ok: true; item: Item } | { ok: false; reason: "empty-text" | "unsupported-format" };

export interface ItemParser {
  parse(text: string): ItemParseResult;
}
