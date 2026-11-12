# Spec Delta

## Purpose

Provide reproducible desktop pointer and keyboard actions with explicit target authorization, bounded timing, cancellation, and observable execution outcomes.

## ADDED Requirements

### Requirement: Seeded bounded pointer motion
The input subsystem SHALL generate smooth time-ordered trajectories and varied click positions inside an inset target region. Identical seeds, geometry, starting positions, and timing settings SHALL produce identical plans. Invalid geometry or timing SHALL be rejected before execution.

#### Scenario: Reproduce a movement plan
- **WHEN** a caller generates two plans with identical valid inputs and seed
- **THEN** their planned points, click positions, and delays match

#### Scenario: Vary targets without crossing their boundary
- **WHEN** plans are generated with different seeds for a valid enabled cell
- **THEN** click positions can vary within its safe inset and timing remains within configured limits

#### Scenario: Invalid or unusable target
- **WHEN** a disabled cell, a cell too small for the inset, or an out-of-bounds target is requested
- **THEN** planning returns a validation failure and emits no native input

### Requirement: Authorized testbed target
During this phase, native actions SHALL target only a main-process-registered application-owned testbed window. Execution SHALL require that window to be foreground and its current geometry to match the authorized plan. Renderer-supplied native handles or arbitrary coordinates SHALL NOT authorize input.

#### Scenario: Focus or geometry changes
- **WHEN** the target loses foreground status, closes, changes bounds, or changes display scale during a run
- **THEN** the run stops before further action events and reports the reason

#### Scenario: Unauthorized caller
- **WHEN** an unregistered renderer requests input or supplies a native window handle
- **THEN** the request is rejected without emitting native input

### Requirement: Cancellable serialized action execution
The runner SHALL execute one bounded action at a time, allow cancellation between scheduled events, and release inputs it pressed on every exit path. It SHALL reject concurrent runs and avoid taking ownership of inputs already held by the user.

#### Scenario: Stop while an input is held
- **WHEN** Stop, Escape in the focused testbed, target loss, or window closure cancels an active run
- **THEN** pending action events are discarded, runner-owned keys and buttons are released, and an explicit stopped result is recorded

#### Scenario: Conflicting physical input
- **WHEN** a required modifier or mouse button is already held before execution
- **THEN** the action is rejected without releasing the user's held input

### Requirement: Separate delivery from observation
The runner SHALL report native delivery failures and observation timeouts explicitly. Successful native delivery SHALL NOT imply that an item changed. A timed-out or partially delivered action SHALL NOT be retried automatically.

#### Scenario: Native injection is partial
- **WHEN** the native adapter reports fewer inserted events than requested
- **THEN** execution fails, releases owned inputs, and records the partial result without repeating the action

#### Scenario: Missing state confirmation
- **WHEN** native input is delivered but the expected fresh observation does not arrive before the deadline
- **THEN** the action reports an unconfirmed outcome and requires an explicit next request
