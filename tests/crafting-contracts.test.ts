import { expect, it } from "vitest";
import { craftRequestSchema, type CraftingEngine } from "../src/domain/crafting-engine";
import { itemSchema, type ItemParser } from "../src/domain/item-parser";

const item = { baseType: "Fixture Flask", rarity: "magic", modifiers: ["Fixture mod"] };
const itemText = "Fixture Flask\nmagic\nFixture mod";

const parser: ItemParser = {
  parse(text) {
    if (text.trim() === "") {
      return { ok: false, reason: "empty-text" };
    }
    if (text !== itemText) {
      return { ok: false, reason: "unsupported-format" };
    }
    return { ok: true, item: itemSchema.parse(item) };
  },
};

const engine: CraftingEngine = {
  plan(request) {
    if (request.goalId !== "fixture-goal") {
      return { ok: false, reason: "unsupported-goal" };
    }
    if ((request.currencyLimits["currency-a"] ?? 0) < 2) {
      return { ok: false, reason: "insufficient-budget" };
    }
    return {
      ok: true,
      intents: [
        { item: request.item, currencyId: "currency-a" },
        { item: request.item, currencyId: "currency-a" },
      ],
    };
  },
};

it("returns a validated item or a typed parse failure", () => {
  expect(parser.parse(itemText)).toEqual({ ok: true, item });
  expect(parser.parse(" ")).toEqual({ ok: false, reason: "empty-text" });
  expect(parser.parse("unknown")).toEqual({ ok: false, reason: "unsupported-format" });
});

it("passes the parsed item to a fixture planner and handles an insufficient budget", () => {
  const parsed = parser.parse(itemText);
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }

  const request = craftRequestSchema.parse({
    item: parsed.item,
    goalId: "fixture-goal",
    currencyLimits: { "currency-a": 2 },
  });

  expect(engine.plan(request)).toEqual({
    ok: true,
    intents: [
      { item, currencyId: "currency-a" },
      { item, currencyId: "currency-a" },
    ],
  });
  expect(engine.plan({ ...request, currencyLimits: {} })).toEqual({
    ok: false,
    reason: "insufficient-budget",
  });
});

it.each([-1, 1.5])("rejects an invalid currency limit (%s)", (limit) => {
  expect(
    craftRequestSchema.safeParse({
      item,
      goalId: "fixture-goal",
      currencyLimits: { "currency-a": limit },
    }).success,
  ).toBe(false);
});
