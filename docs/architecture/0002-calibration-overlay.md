# 0002. Calibration overlay and layout identity

Change: `add-calibration-overlay` (approved 2026-11-12).

## Context

Inventory is a regular grid; the General, Atlas and League currency pages have irregular slots. The reference images are cropped examples, not desktop coordinates or an authoritative list of current-league currencies.

## Model and coordinates

- Keep `layoutId` and immutable `geometryVersion` separate from the JSON `schemaVersion`. Changing slot membership or geometry requires a new geometry version. Updating only optional `defaultLabel` metadata does not invalidate calibration.
- Identify a slot by layout, page and stable slot ID. Array order and human-readable labels are never identity. Initial IDs are neutral; do not infer currency names from icons or renumber existing IDs.
- Template slot rectangles use a unit rectangle (0..1). A calibrated page has a display-local DIP frame and normalized per-slot bounds with `enabled` flags. Disabled slots retain their identity and geometry. All four surfaces have independent calibration.
- Preserve the existing `calibrationSchema` for materialized domain geometry. Validate dynamic references against the selected template before accepting a saved profile.
- Display snapshots have signed desktop bounds; calibration frames have nonnegative display-local coordinates. Electron uses DIP, so add the desktop origin exactly once and do not multiply coordinates by `scaleFactor`. Keep fractional geometry until rendering.
- Move/resize pure functions clamp to their containing area and keep positive dimensions. Inventory always consists of 12 columns and 5 rows; changing a stash frame preserves normalized slot positions.

This avoids hardcoded UI pixels and prevents a future label change from breaking saved coordinates. See [layout format](../calibration-layouts.md) for the schema example and reference audit.

## Planned desktop boundary

The approved design calls for a separate transparent, nonresizable BrowserWindow and an ordinary control window. SVG content will be resized inside the overlay rather than resizing the transparent native window. Main will own hidden/editing/preview transitions, display compatibility and typed IPC. These desktop, IPC and storage decisions remain to be implemented and verified; this record will be extended with actual results as those tasks close.

## Consequences

Geometry and profile validation run in Node tests without Electron or PoE. A new geometry version requires explicit selection and a separate calibration. Initial reference coordinates can be manually refined; extra Standard cells have no inferred current-league meaning. Native transparency, input pass-through and focus still require Windows/game acceptance tests.
