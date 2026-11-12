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

## Desktop window and input modes

The desktop uses a separate transparent, nonresizable BrowserWindow and an ordinary control window. SVG content is resized inside the overlay rather than resizing the transparent native window. Both windows retain context isolation, sandbox and disabled Node integration. The control window is explicitly shown and focused after loading: the first implicit-show probe was not visible to the user.

Main owns hidden/editing/preview transitions. Editing enables native focus and pointer input. Preview releases focus, disables focusability and ignores mouse events before showing without activation. Hidden mode also releases input. Escape in the focused editor cancels the draft; the ordinary window remains the route back from click-through preview. Closing that window disposes the overlay, IPC handlers and display listeners.

Display snapshots use bounds, scale factor and rotation. A display disappearing or changing those settings hides the overlay, preserves previous geometry and requires recalibration. Isolated tests cover DPI changes, signed origins, rotation, invalid requests and cleanup. Physical 100%/150% acceptance remains open until performed. Selecting a new geometry version also hides the previous calibration and restores a profile only if both layout version and display snapshot match.

The user confirmed the early dev overlay and build/start visibility over borderless windowed PoE and with PoE closed on a 3440 × 1440 display, including hide. The supported game mode is borderless windowed only; ordinary windowed mode is outside the acceptance scope. Automated geometry coverage spans six resolutions and four scales, without claiming native acceptance for all hardware.

## Consequences

Geometry and profile validation run in Node tests without Electron or PoE. A new geometry version requires explicit selection and a separate calibration. Initial reference coordinates can be manually refined; extra Standard cells have no inferred current-league meaning. Native transparency, input pass-through and focus still require Windows/game acceptance tests.

## Persistence and import boundary

The editor applies pure gestures from a pointer-down snapshot, using the inverse SVG screen transform to convert client coordinates into local SVG/DIP coordinates. It sends a profile at gesture completion rather than flooding IPC on every pointer move. The pending update promise is flushed before Save/Cancel, so a final drag cannot arrive after the save. An in-flight authoritative update does not overwrite a newer local drag. Slot moves preserve adjacent slots and page identity; frame resizing leaves normalized slot geometry unchanged.

Every service snapshot has a monotonically increasing runtime revision. Both renderer views discard older replies, including delayed `getState` results arriving after newer broadcasts. Save waits for pending gestures and explicitly submits the currently visible profile before writing. Page selection captures the selected value before awaiting pending work. These rules address the reported return to an older visual layout after Save; regression tests reorder snapshots and verify the saved geometry.

`CalibrationService` owns workspace state, the editable draft and mode transitions; `WorkspaceStore` owns serialized file writes. The application stores `calibration-workspace.json` under Electron's `userData`. Tests use temporary directories and synthetic adapters, never the real user profile. A profile is added/replaced only after explicit Save; cancel restores the previous in-memory profile. A failed write leaves both the old file and the draft intact for retry.

The store validates a fresh temporary file before replacing the destination. Malformed JSON, unsupported format versions and invalid references block automatic writes. Reset requires a native confirmation and creates a uniquely named recovery copy before replacing existing data. Concurrent operations are serialized, and display compatibility is rechecked after pending writes to avoid showing stale geometry.

An import uses a main-owned file dialog (JSON, at most 2 MB). The renderer cannot supply a path. A parsed candidate is previewed before confirmation; import does not activate a new geometry version. Metadata-only changes replace template labels but leave profiles untouched. Geometry conflicts with an existing version are rejected. Catalogue comparison ignores slot ordering and labels.

Preload exposes named typed methods, not raw `ipcRenderer`. Mutations return typed success/error envelopes; the bridge preserves error codes as errors. Main checks the window's WebContents identity, top-level frame and payload schema. Only editing-specific operations are available to the overlay; layout import/reset remain control-window operations. Subscriptions return an unsubscribe function, and closing the panel removes all handlers and display listeners.
