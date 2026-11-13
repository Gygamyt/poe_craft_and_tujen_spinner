# Spec Delta

## Purpose

Associate calibrated Currency Stash slots with catalog currency identities using explicit user settings and reviewable defaults, without confusing assignments with observed stash contents.

## ADDED Requirements

### Requirement: Stable semantic slot assignments
Each assignment SHALL reference a game, layout version, stash context, page, slot and stable currency base ID with catalog provenance. General, Atlas and League slots with identical local IDs SHALL remain distinct. Display labels SHALL NOT serve as currency identifiers or alter geometry.

#### Scenario: Assign a catalog currency
- **WHEN** the user selects an existing slot and a supported currency from catalog search
- **THEN** the draft associates that page/slot with its stable base ID and snapshot provenance, displaying the catalog name

#### Scenario: Same slot ID on different pages
- **WHEN** General slot-001 and Atlas slot-001 receive different assignments
- **THEN** saving preserves both independently

#### Scenario: Invalid target or currency
- **WHEN** a command references a nonexistent page/slot, a missing catalog record or a non-currency base
- **THEN** it is rejected without changing saved assignments or calibration

### Requirement: Reviewed presets and user precedence
Preset assignments SHALL identify their version, compatible layout and evidence. Only reviewed entries SHALL be offered as defaults. User assignments and explicit clears SHALL override defaults. Applying or updating a preset SHALL require review and SHALL NOT silently replace user overrides. Unidentified slots SHALL remain unassigned.

#### Scenario: Apply a partial preset
- **WHEN** the user previews and accepts a preset containing only verified positions
- **THEN** only those assignments are proposed, unmapped slots remain unassigned and provenance/coverage are visible before Save

#### Scenario: Clear a preset assignment
- **WHEN** the user clears a defaulted slot and saves
- **THEN** it remains unassigned after restart and later preset application until the user explicitly restores that default

### Requirement: Explicit save and independent persistence
The editor SHALL provide draft Save and Cancel. Successful Save SHALL persist assignments atomically and update displayed labels; Cancel SHALL preserve saved state. Assignment storage SHALL be independent of catalog snapshots and calibration geometry. Damaged or newer settings SHALL be preserved and reported without automatic reset.

#### Scenario: Save and restart
- **WHEN** assignments on all three pages are saved and the app restarts offline
- **THEN** they are restored without reimporting catalog data or changing calibrated rectangles

#### Scenario: Failed save or cancelled editing
- **WHEN** writing fails or the user cancels a changed draft
- **THEN** previously saved assignments remain effective and an unsuccessful save does not report success

### Requirement: Compatibility requires explicit review
Assignments SHALL apply only to their selected layout version and stash context. A new layout version or changed league context SHALL NOT silently inherit actionable assignments. Missing catalog identities SHALL retain their references and visible warnings, without name-based substitution. Screen resolution or DPI changes alone SHALL NOT change semantic assignments.

#### Scenario: Switch league or layout
- **WHEN** the user selects another league context or geometry version
- **THEN** that scope's assignments are loaded or shown as unconfigured; copying older assignments requires explicit review

#### Scenario: Catalog record becomes unavailable
- **WHEN** the referenced snapshot or currency ID cannot be resolved
- **THEN** the assignment remains visible by stable ID but cannot resolve as a usable source until explicitly repaired or revalidated

### Requirement: Explicit source resolution
A source lookup SHALL use saved assignments and the current compatible calibration profile. Unassigned, disabled or incompatible slots SHALL NOT resolve as usable sources. Multiple eligible slots for one currency SHALL require an explicit slot selection. A result SHALL carry binding revision and catalog/layout context for future consumers.

#### Scenario: Duplicate currency assignments
- **WHEN** two enabled compatible slots are assigned to the requested currency and no slot is specified
- **THEN** lookup reports ambiguity instead of selecting the first slot

#### Scenario: Disabled or unassigned source
- **WHEN** a requested slot is disabled in calibration or has no effective assignment
- **THEN** lookup reports the reason without supplying a usable click target

### Requirement: Assignment is not a live observation
The UI and public results SHALL distinguish configured currency identity from live presence and quantity. This capability SHALL NOT infer item counts, move currency in-game or emit native game input.

#### Scenario: Assigned slot may be empty
- **WHEN** a slot is assigned to Chaos Orb without a live observation
- **THEN** it is shown as a configured Chaos Orb source with presence and quantity unknown, not as a confirmed available stack
