# Technical debt

## TD-001 — Native DPI acceptance for the calibration overlay

**Status:** Open; deferred by explicit user decision.

**Source:** `add-calibration-overlay`, former tracked tasks 2.3 and 5.2. These checks were moved to debt, not completed or waived as evidence of compatibility.

**Verified:** Native dev/build use at 3440 × 1440 and 125% Windows scale, including editing, preview, Save, restoration and preview controls. The automated suite has 99 passing tests; geometry covers six resolutions and four scales, and native adapters cover display invalidation and cleanup.

**Unverified:** Physical Windows scale transitions at 100% and 150%, including the complete native workflow at those settings. Additional-monitor acceptance has not been performed; test it when hardware is available.

**Completion criteria:**

- Leave the app open, change Windows scale between 100% and 150%, and confirm stale markup and preview controls hide with a recalibration prompt.
- At each scale verify Inventory and General/Atlas/League alignment, frame/slot gestures, enabled flags, Escape, Save/restart, matching preview visuals, input pass-through, compact-panel Hide and all-window shutdown.
- Repeat in dev and build/start with Vite stopped, over borderless windowed PoE and with PoE closed. Record actual display settings and results.
- Return to the original 125% configuration and confirm its saved calibration remains available.
- With suitable hardware, verify a second monitor, signed desktop origins and mixed DPI; otherwise keep that hardware limitation explicit.

**Acceptance decision:** The user asked to carry these checks as technical debt so development can continue. Functional DPI requirements remain unchanged. Native compatibility beyond the verified configuration must not be represented as manually confirmed.
