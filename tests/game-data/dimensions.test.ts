import { expect, it } from "vitest";
import { decodeBaseDimensions } from "../../src/features/game-data";
it("projects only source dimensions and retains explicit provenance", () => {
  expect(
    decodeBaseDimensions("base", "snapshot", { inventory_width: 2, inventory_height: 3 }),
  ).toEqual({ status: "known", baseId: "base", snapshotId: "snapshot", width: 2, height: 3 });
  expect(decodeBaseDimensions("base", "snapshot", {})).toMatchObject({ status: "unknown" });
});
it.each([undefined, null, 0, -1, 1.5, Infinity, NaN, "2", Number.MAX_SAFE_INTEGER + 1])(
  "rejects partial or invalid source dimensions %s",
  (width) => {
    expect(
      decodeBaseDimensions("base", "snapshot", { inventory_width: width, inventory_height: 3 }),
    ).toMatchObject({ status: "invalid" });
  },
);
