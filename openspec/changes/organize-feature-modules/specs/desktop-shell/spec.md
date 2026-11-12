# Spec Delta

## ADDED Requirements

### Requirement: Discoverable feature ownership
The repository SHALL provide a concise code map identifying each implemented feature's public contracts, implementation entry points, tests, and relevant architecture documentation.

#### Scenario: Locate a calibration change
- **WHEN** a developer follows the calibration entry in the code map
- **THEN** they can identify its contracts, state management, desktop adapter, views, and focused verification command without reading unrelated features

### Requirement: Checked dependency boundaries
The repository SHALL reject prohibited imports during its standard lint check: platform APIs in pure feature logic or renderer code, and cross-feature imports that bypass declared public entry points.

#### Scenario: Platform dependency leaks into pure logic
- **WHEN** pure feature logic imports Electron or a Node.js platform API
- **THEN** the standard lint command fails with an actionable import violation

#### Scenario: Another feature imports a private implementation
- **WHEN** a feature imports another feature's internal implementation instead of its declared public entry point
- **THEN** the standard lint command fails

### Requirement: Focused feature verification
The repository SHALL provide documented commands that run calibration tests or crafting-contract tests independently while retaining the full test command.

#### Scenario: Verify calibration in isolation
- **WHEN** a developer runs the documented calibration test command
- **THEN** all calibration tests run and unrelated crafting-contract tests are excluded

#### Scenario: Verify the whole project
- **WHEN** a developer runs the existing full test command
- **THEN** it includes both feature suites and all integration checks
