# Spec Delta

## Purpose

Represent rectangular inventory items consistently across catalog facts, occupied cells, screen targets and isolated input tests, without assuming every item occupies one cell.

## ADDED Requirements

### Requirement: Source-backed base dimensions
The system SHALL expose base width and height in inventory cells using a stable base ID and snapshot ID. Valid dimensions SHALL be positive safe integers. Missing or invalid dimensions SHALL be reported explicitly, never replaced with a one-cell default or inferred from item class or display name.

#### Scenario: Inspect an existing imported base
- **WHEN** the user inspects Plate Vest in the accepted snapshot without reimporting it
- **THEN** the inspector displays width 2 and height 3 associated with that base and snapshot

#### Scenario: Missing or malformed source dimensions
- **WHEN** a base has absent, partial, zero, negative, fractional or non-finite dimensions
- **THEN** lookup reports an unknown or invalid footprint and item targeting is unavailable

#### Scenario: Snapshot activation during use
- **WHEN** the active snapshot changes after a consumer resolves a base in an earlier snapshot
- **THEN** the consumer keeps its explicit snapshot reference or receives an unavailable result rather than silently adopting different dimensions

### Requirement: Validated rectangular placement
An inventory placement SHALL identify one item instance, its base and snapshot, a zero-based top-left cell and its dimensions. Placement validation SHALL reject invalid coordinates, duplicate instance IDs, out-of-bounds rectangles and overlap. All cells of a valid rectangle SHALL resolve to the same item instance; empty cells SHALL resolve to no item.

#### Scenario: Multi-cell occupancy
- **WHEN** a 2x3 item is placed at column 4, row 1 of a 12x5 inventory
- **THEN** columns 4 through 5 and rows 1 through 3 resolve to one instance, not six independently actionable items

#### Scenario: Boundary and overlap rejection
- **WHEN** a placement extends beyond the inventory or intersects an existing item
- **THEN** it is rejected without replacing the previous valid state or producing an input target

#### Scenario: Empty cell and shared edge
- **WHEN** a point is in an empty cell or exactly on an internal boundary between adjacent items
- **THEN** hit testing returns no item for the empty cell and deterministically one item for the shared edge, never both

### Requirement: Item-sized screen targets
The system SHALL map a valid placement through the inventory's current screen rectangle to one item-sized target. Click plans SHALL stay inside that target with an edge inset. No input SHALL be emitted for unknown dimensions, invalid placement, insufficient target area or stale item/placement context.

#### Scenario: Scale-independent projection
- **WHEN** the same 2x3 placement is projected into different valid inventory screen rectangles
- **THEN** it covers exactly two cell widths and three cell heights in each rectangle and its click point remains inside the inset area

#### Scenario: Placement changes after planning
- **WHEN** item identity, placement revision, snapshot or target geometry changes before a pending click is delivered
- **THEN** the old action is cancelled or rejected and owned inputs are released without applying currency

### Requirement: Independent currency slot geometry
Inventory footprints SHALL NOT replace the named regions of General, Atlas or League currency stash pages. Resolving a currency source SHALL continue to use its configured slot region independently of the target item's dimensions.

#### Scenario: Currency applied to a large item
- **WHEN** a supported currency slot is selected and a valid 2x4 inventory item is targeted
- **THEN** the source uses its named slot region and the destination uses the item's occupied rectangle

### Requirement: Multi-cell testbed evidence
The isolated testbed SHALL allow selection and anchored placement of synthetic 1x1, 1x3, 2x3 and 2x4 items, display one item across its occupied cells, and retain seeded replay and fresh observations. A confirmed currency action anywhere inside a valid item SHALL change that instance once and consume exactly one unit. Invalid placement SHALL leave fixture state unchanged.

#### Scenario: Native action on a multi-cell item
- **WHEN** the owned-window native harness selects currency and clicks inside a 2x3 item away from its top-left cell
- **THEN** received-event evidence identifies that instance and confirms exactly one currency consumption and one item version change

#### Scenario: Reconfigure while a run is pending
- **WHEN** the testbed item size or anchor is changed during pending input
- **THEN** the run stops, the placement context advances and an observation from the earlier context cannot confirm a later action

#### Scenario: No installed catalog or running game
- **WHEN** the user opens the testbed without imported catalog data or a running PoE client
- **THEN** explicit synthetic footprint fixtures remain usable and user calibration files are unchanged
