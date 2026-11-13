# ADR 0006: Inventory item footprints

Status: accepted for implementation in add-item-footprints.

Catalog dimensions are a typed read projection of base raw `inventory_width` and `inventory_height`, tied to an explicit base/snapshot ID. Only positive safe integers are known dimensions. Missing fields report unknown; malformed/partial fields report invalid. No class/name inference or 1x1 fallback is allowed. Existing immutable bundles, checksums, SQLite schema 1 and calibration JSON require no migration.

The pure inventory feature owns anchors, rectangular occupancy and screen projection. Catalog owns source facts; input owns inset seeded motion over rectangles. Zero-based cell rectangles and points use half-open bounds. Placement validation precedes state replacement and rejects duplicates, overlaps and grid overflow. Named currency stash slots remain independent.

Projection scales column/row and width/height by the inventory rectangle's cell extents. The existing motion planner rejects insufficient inset area. Each session captures item instance/base/snapshot/revision and verifies it before native operations alongside the existing focus/geometry token. Successful placement edits first validate a candidate copy, then cancel input before replacing state and incrementing the epoch. Cancellation marks pending observations inactive so a cleanup button-up cannot spend currency.

Item context includes instance/base/snapshot identity and placement revision. Reconfiguration cancels pending input before state replacement; geometry/focus checks and fresh observations remain required. The isolated testbed uses explicit synthetic presets without requiring a catalog. This does not establish real PoE item location or authorize game input.
