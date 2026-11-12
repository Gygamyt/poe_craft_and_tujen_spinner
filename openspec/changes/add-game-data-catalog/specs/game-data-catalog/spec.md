# Spec Delta

## Purpose

Provide a traceable offline catalog of Path of Exile game facts that users and future crafting strategies can inspect independently of prices or native input.

## ADDED Requirements

### Requirement: Versioned source provenance
Every imported snapshot SHALL identify its game, data-schema version, source revisions, retrieval time, content hashes, declared game patch, language, and coverage. Unknown patch or league compatibility SHALL be shown as unverified rather than inferred from download time.

#### Scenario: Inspect an imported snapshot
- **WHEN** the user opens catalog status
- **THEN** source, revision, patch, language, coverage, and verification status are visible

#### Scenario: Unsupported game or schema
- **WHEN** a bundle declares an unsupported game or schema version
- **THEN** import is rejected and the current catalog remains usable

### Requirement: Validated atomic import
The catalog SHALL validate bundle hashes, identifiers, required fields, ordered data, and cross-references before activation. Failed or interrupted imports SHALL preserve the previously active snapshot. Each read operation SHALL use one consistent snapshot.

#### Scenario: Broken modifier reference
- **WHEN** an imported modifier references an absent required stat, tag, or group record
- **THEN** import fails with a diagnostic identifying the source record and does not replace the active catalog

#### Scenario: Import is interrupted
- **WHEN** import fails or the process exits before activation completes
- **THEN** restarting the app retains the previous active snapshot or explicitly reports that no catalog has been activated

### Requirement: Offline catalog lookup
The catalog SHALL support bounded searches and stable-ID lookups for bases and modifiers, including item classes, tags, modifier groups, stat ranges, level requirements, and ordered weights. Queries SHALL work without a network connection after import and SHALL distinguish missing data from an empty valid result.

#### Scenario: Inspect a base and a modifier offline
- **WHEN** the user searches the imported catalog without internet access
- **THEN** matching records and their snapshot identifiers are returned with the imported facts and provenance

#### Scenario: No catalog installed
- **WHEN** a lookup occurs before a successful import
- **THEN** the application reports catalog-unavailable rather than returning a misleading empty list

### Requirement: Preserve source semantics and coverage limits
The catalog SHALL preserve stable upstream identifiers, modifier groups, stat ranges, and weight ordering without inventing tiers, probabilities, or unsupported crafting rules. Untranslated or unsupported records SHALL remain identifiable with explicit limitations.

#### Scenario: Ordered weight rules
- **WHEN** a modifier contains several ordered tag-weight entries including zero weights
- **THEN** lookup returns those entries in source order with zero values preserved

#### Scenario: Partial translation or coverage
- **WHEN** an imported record lacks a supported display translation or requires an unsupported mechanic
- **THEN** the inspector shows its stable identifier and limitation instead of asserting a complete recipe eligibility result

### Requirement: Explicit refresh and snapshot selection
The application SHALL allow explicit import and selection of a previously validated snapshot. Refresh SHALL NOT silently change the snapshot used by an in-progress consumer. Calibration settings SHALL remain independent of catalog replacement.

#### Scenario: Activate a new league-era snapshot
- **WHEN** the user explicitly activates a validated snapshot while a consumer holds an earlier snapshot reference
- **THEN** new queries use the new snapshot, the existing consumer remains pinned or receives an explicit unavailable result, and calibration profiles are unchanged
