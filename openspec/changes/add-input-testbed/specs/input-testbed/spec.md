# Spec Delta

## Purpose

Provide an application-owned interactive test target for validating real desktop input and synthetic state changes without requiring a running game.

## ADDED Requirements

### Requirement: Independent inventory and stash fixture
The application SHALL provide an isolated testbed with a 12x5 inventory and General, Atlas, and League stash pages using stable slot identifiers. Its geometry and state SHALL be independent of saved user calibration profiles.

#### Scenario: Open with the game closed
- **WHEN** the user opens the testbed without a running game
- **THEN** the inventory and all three selectable stash pages are usable and existing calibration profiles remain unchanged

#### Scenario: Disabled or hidden slot
- **WHEN** an action targets a disabled slot or a slot on an inactive page
- **THEN** it is rejected rather than applied to another visible cell

### Requirement: Native event evidence
The testbed SHALL record received pointer and supported keyboard events with run identifiers, target identifiers, and timestamps. Native acceptance SHALL use the OS input adapter rather than programmatically dispatched renderer events.

#### Scenario: Inspect a native click
- **WHEN** a native test run clicks a valid fixture cell
- **THEN** the trace shows both planned and delivered events and the target's observed event with its actual local position

### Requirement: Deterministic synthetic state
The testbed SHALL support seeded reset, bounded synthetic currency application, and fresh versioned item observations. Fixture outcomes SHALL be explicitly labeled synthetic and SHALL NOT be presented as real crafting probabilities.

#### Scenario: Apply one synthetic currency action
- **WHEN** the user selects a fixture currency with a secondary click and applies it to an inventory item with a primary click
- **THEN** exactly one unit is consumed, the synthetic item changes once, and the observation version increases

#### Scenario: Replay the fixture
- **WHEN** the fixture is reset with the same seed and receives the same supported action sequence
- **THEN** resulting synthetic item states and currency counts match

### Requirement: Observable fault and stop controls
The testbed SHALL expose Stop, reset, and explicit fault modes for delayed or missing observations. The runner SHALL require a fresh matching observation before accepting an action outcome.

#### Scenario: Delay exceeds the observation deadline
- **WHEN** a configured delay prevents confirmation before the deadline
- **THEN** the run becomes unconfirmed and no second currency action is sent automatically

#### Scenario: Stale observation arrives
- **WHEN** an observation from an earlier run or item version arrives
- **THEN** it is retained as trace evidence but cannot confirm the current action

#### Scenario: Close the testbed during a run
- **WHEN** the testbed window closes while input is pending
- **THEN** the run is cancelled, owned inputs are released, and its native target registration is removed
