import { expect, it } from "vitest";
import { testbedLayout } from "../../src/features/testbed/domain/layout";
import { createFixture, fixtureTargets } from "../../src/features/testbed";
it.each([
  { width: 900, height: 560 },
  { width: 1066, height: 760 },
  { width: 1920, height: 1080 },
  { width: 2752, height: 1100 },
  { width: 3440, height: 1440 },
])("keeps native surfaces inside the viewport and clear of controls/details %j", (viewport) => {
  const layout = testbedLayout(viewport);
  expect(layout.inventory.x).toBeGreaterThanOrEqual(layout.stash.x + layout.stash.width);
  expect(layout.details.y).toBeGreaterThan(layout.inventory.y + layout.inventory.height);
  for (const area of [layout.stash, layout.inventory, layout.details]) {
    expect(area.x).toBeGreaterThanOrEqual(layout.sidebar);
    expect(area.x + area.width).toBeLessThanOrEqual(viewport.width);
    expect(area.y + area.height).toBeLessThanOrEqual(viewport.height);
  }
  for (const target of fixtureTargets(createFixture(1), viewport)) {
    expect(target.bounds.x).toBeGreaterThanOrEqual(layout.sidebar);
    expect(target.bounds.x + target.bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(target.bounds.y + target.bounds.height).toBeLessThanOrEqual(viewport.height);
  }
});
