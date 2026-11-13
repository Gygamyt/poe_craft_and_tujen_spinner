export type BaseDimensions = { baseId: string; snapshotId: string } & (
  | { status: "known"; width: number; height: number }
  | { status: "unknown" | "invalid"; reason: string }
);

/** Read source facts without altering an immutable bundle or guessing a default. */
export function decodeBaseDimensions(
  baseId: string,
  snapshotId: string,
  raw: unknown,
): BaseDimensions {
  const context = { baseId, snapshotId };
  if (!raw || typeof raw !== "object")
    return { ...context, status: "unknown", reason: "Source dimensions unavailable" };
  const source = raw as Record<string, unknown>;
  const width = source.inventory_width,
    height = source.inventory_height;
  if (width === undefined && height === undefined)
    return { ...context, status: "unknown", reason: "Source dimensions unavailable" };
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  )
    return {
      ...context,
      status: "invalid",
      reason: "Source dimensions must be positive safe integers",
    };
  return { ...context, status: "known", width, height };
}
