# Calibration layout format

The checked [example JSON](examples/calibration-layout.json) demonstrates the format, not a usable game layout. The bundled `src/features/calibration/layouts/reference-v1.json` is the manually enumerated starting layout from the user's screenshots. Coordinates describe slot interiors approximately; the overlay supports manual refinement.

## Identity and labels

`schemaVersion: 1` identifies the file format. `layoutId` identifies a family of layouts; `geometryVersion` identifies its immutable slot membership and geometry. The inventory has 12 columns and 5 rows. All three currency pages are required.

Each slot has a stable `id` and normalized `bounds` inside the page frame. Coordinates and dimensions are nonnegative/positive respectively, and right/bottom edges must not exceed 1. IDs must be unique within their page; matching local IDs on different pages are independent.

`defaultLabel` is optional. All real labels are deliberately unset in the reference layout. The UI can display `Slot 1` for `slot-001`; future currency names can be filled in without changing that ID, geometry version, saved coordinates or the user's enabled/disabled choice. Do not assign a new currency to an old ID just to reuse a position.

When the league changes geometry, publish a new `geometryVersion`. Preserve existing versions and calibrations, require explicit selection of the new one, and calibrate it separately. Do not renumber IDs when inserting a new slot. Changes to labels alone do not require new geometry or recalibration.

## Reference audit

The page frame corresponds to the full cropped stash panel, including its tabs and border. Only slot interiors are marked. No currency names, game resolution, DPI or current league are inferred from the files.

| Page / source | Main row counts, top to bottom | Shared lower rows | Extra bottom slots | Total |
| --- | --- | --- | --- | --- |
| General / `reference/First currency.jpg` | 9 + 10 + 10 + 8 + 8 | 7 + 7 | 1 | 60 |
| Atlas / `reference/Second currency.jpg` | 8 + 8 + 4 + 7 + 7 + 7 | 7 + 7 | 3 | 58 |
| League / `reference/Third currency.jpg` | 7 + 7 + 5 + 2 + 2 + 1 | 7 + 7 | 1 | 39 |

Dark and empty slots are included. Tabs, decoration and the large central item rectangle are excluded. The shared lower blocks occupy General IDs 046–059, Atlas 042–055 and League 025–038. The last 1/3/1 IDs respectively represent the extra bottom slots. These are independently disableable; their function in a current league is intentionally undecided.

`reference/Char.jpg` supplies the 12 × 5 inventory grid. Equipment and flask sockets are outside the inventory calibration.

## Calibration coordinates

Templates contain no desktop coordinates. A user profile stores the display snapshot (signed desktop bounds, scale factor and rotation), a local inventory frame and a local frame plus normalized slot adjustments/enabled flags for each page. Display-local coordinates use DIP; physical pixels and `devicePixelRatio` must not be applied again.

Pure schema and geometry tests validate the example, reference counts, missing labels, boundary failures, display origins and lossless JSON round trips.

## Import and persistence behavior

The main process reads a layout only through its native JSON chooser. Import first prepares a candidate and summary; confirmation stores the version, while cancellation leaves the catalogue unchanged. A newly imported version remains inactive until explicitly selected. An existing geometry version can receive updated labels when its slot IDs and bounds are unchanged; slot ordering does not count as a geometry change.

The application workspace file is `calibration-workspace.json` under Electron's `userData`. It contains templates, confirmed profiles and preferences. Draft geometry is excluded until Save succeeds. Save failure keeps the last confirmed file and editable draft, so the user can retry. Selecting a previously calibrated layout/display snapshot restores its profile; new geometry versions or incompatible display settings require calibration.

An unreadable or unsupported workspace is preserved and automatic writes are blocked. The explicit Reset operation asks for confirmation, saves a recovery copy beside the workspace and then restores the bundled catalogue. A canceled reset leaves the original file intact. Tests cover both malformed JSON and unknown format versions using temporary directories.

See the [overlay guide](calibration-overlay.md) for editor controls, when to keep the app open and when to close it for a persistence check. Service, storage and gesture behavior is covered by isolated tests; native Windows acceptance is tracked separately in the change tasks and progress journal.
