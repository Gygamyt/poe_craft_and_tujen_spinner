import { expect, it } from "vitest";
import { bundledLayout } from "../src/layouts";
import { pageIds, slotLabel } from "../src/domain/calibration-layout";
import { layoutTemplateSchema } from "../src/domain/calibration-layout";
import documentedExample from "../docs/examples/calibration-layout.json";

it("keeps the documented JSON example valid", () => {
  expect(layoutTemplateSchema.parse(documentedExample).layoutId).toBe("example");
});

it("loads the manually audited reference layout, with empty cells and extras included", () => {
  expect(bundledLayout.inventory).toEqual({ rows: 5, columns: 12 });
  expect(pageIds.map((page) => bundledLayout.pages[page].slots.length)).toEqual([60, 58, 39]);
  for (const page of pageIds) {
    const slots = bundledLayout.pages[page].slots;
    expect(slots.every((slot) => slot.defaultLabel === undefined)).toBe(true);
    expect(slots.filter((slot) => slot.bounds.y > 0.9).length).toBe(page === "atlas" ? 3 : 1);
    // The central item rectangle is not a currency slot on any page.
    expect(
      slots.some(
        ({ bounds: b }) => b.x < 0.5 && b.x + b.width > 0.5 && b.y < 0.55 && b.y + b.height > 0.55,
      ),
    ).toBe(false);
    const reordered = [...slots].reverse();
    expect(slotLabel(reordered[0])).toBe(slotLabel(slots.at(-1)!));
  }
});
