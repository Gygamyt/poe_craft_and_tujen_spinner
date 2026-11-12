import { createCalibrationProfile } from "../domain/calibration-geometry";
import {
  parseCalibrationProfile,
  type CalibrationProfile,
  type DisplaySnapshot,
  type LayoutTemplate,
  type PageId,
} from "../domain/calibration-layout";
import {
  displayKey,
  layoutKey,
  mergeTemplate,
  saveProfile,
  workspaceSchema,
  type CalibrationWorkspace,
} from "../domain/calibration-workspace";
import type { DesktopState, OverlayMode } from "../contracts";

export interface CalibrationStorage {
  save(workspace: CalibrationWorkspace): Promise<void>;
  reset(confirmed: boolean): Promise<CalibrationWorkspace>;
}

export interface CalibrationPlatform {
  setMode(mode: OverlayMode): void;
  setBounds(display: DisplaySnapshot): void;
  chooseImport(): Promise<unknown | undefined>;
  confirmReset(): Promise<boolean>;
}

export class CalibrationService {
  readonly state: DesktopState;
  onChange: () => void = () => undefined;
  private previousProfile: CalibrationProfile;
  private workspace: CalibrationWorkspace;

  constructor(
    workspace: CalibrationWorkspace,
    displays: DisplaySnapshot[],
    private readonly storage: CalibrationStorage,
    private readonly platform: CalibrationPlatform,
    loadError?: string,
  ) {
    this.workspace = workspaceSchema.parse(workspace);
    const display =
      displays.find((item) => item.id === workspace.preferences.displayId) ?? displays[0];
    if (!display) throw new Error("No display is available for calibration");
    const template = this.template();
    const saved = this.findProfile(template, display);
    this.state = {
      revision: 0,
      profile: saved ?? createCalibrationProfile(template, display),
      page: workspace.preferences.page,
      visible: false,
      mode: "hidden",
      displays: structuredClone(displays),
      selectedDisplayId: display.id,
      requiresCalibration: !saved,
      templates: structuredClone(workspace.templates),
      activeLayoutKey: layoutKey(template),
      inventoryVisible: workspace.preferences.inventoryVisible,
      stashVisible: workspace.preferences.stashVisible,
      busy: false,
      recoveryRequired: Boolean(loadError),
      error: loadError,
    };
    this.previousProfile = structuredClone(this.state.profile);
  }

  getState(): DesktopState {
    return structuredClone(this.state);
  }

  private notify(): void {
    this.state.revision++;
    this.onChange();
  }

  private template(): LayoutTemplate {
    const template = this.workspace.templates.find(
      (item) => layoutKey(item) === layoutKey(this.workspace.preferences),
    );
    if (!template) throw new Error("Selected layout is missing");
    return template;
  }

  private findProfile(
    template: LayoutTemplate,
    display: DisplaySnapshot,
  ): CalibrationProfile | undefined {
    const saved = this.workspace.profiles.find(
      (item) =>
        layoutKey(item) === layoutKey(template) && displayKey(item.display) === displayKey(display),
    );
    return saved ? structuredClone(saved) : undefined;
  }

  private selectedDisplay(): DisplaySnapshot {
    const display = this.state.displays.find((item) => item.id === this.state.selectedDisplayId);
    if (!display) throw new Error("Select an available display first");
    return display;
  }

  private idle(): void {
    if (this.state.busy) throw new Error("Another calibration operation is still running");
  }

  private setMode(mode: OverlayMode): void {
    this.platform.setMode(mode);
    this.state.mode = mode;
    this.state.visible = mode !== "hidden";
  }

  edit(): void {
    this.idle();
    if (this.state.mode === "editing") return;
    const display = this.selectedDisplay();
    this.previousProfile = structuredClone(this.state.profile);
    if (displayKey(this.state.profile.display) !== displayKey(display)) {
      this.state.profile =
        this.findProfile(this.template(), display) ??
        createCalibrationProfile(this.template(), display);
    }
    this.platform.setBounds(display);
    this.setMode("editing");
    if (!this.state.recoveryRequired) this.state.error = undefined;
    this.notify();
  }

  cancel(): void {
    this.idle();
    if (this.state.mode === "editing") this.state.profile = structuredClone(this.previousProfile);
    this.setMode("hidden");
    this.notify();
  }

  hide(): void {
    this.cancel();
  }

  preview(page: PageId): void {
    this.idle();
    if (this.state.mode === "editing") throw new Error("Save or cancel editing first");
    if (this.state.requiresCalibration)
      throw new Error("Save a calibration for these display settings first");
    this.selectedDisplay();
    this.selectPage(page);
    this.setMode("preview");
    this.notify();
  }

  selectPage(page: PageId): void {
    this.idle();
    this.state.page = page;
    this.notify();
  }

  setVisibility(inventory: boolean, stash: boolean): void {
    this.idle();
    this.state.inventoryVisible = inventory;
    this.state.stashVisible = stash;
    this.notify();
  }

  updateProfile(input: unknown): void {
    this.idle();
    if (this.state.mode !== "editing") throw new Error("Calibration can only change while editing");
    const profile = parseCalibrationProfile(this.template(), input);
    if (displayKey(profile.display) !== displayKey(this.selectedDisplay()))
      throw new Error("Calibration display does not match the selected display");
    this.state.profile = profile;
    this.notify();
  }

  private preferences(): CalibrationWorkspace["preferences"] {
    return {
      ...this.workspace.preferences,
      displayId: this.state.selectedDisplayId,
      page: this.state.page,
      inventoryVisible: this.state.inventoryVisible,
      stashVisible: this.state.stashVisible,
    };
  }

  private async transaction(action: () => Promise<void>): Promise<void> {
    this.idle();
    this.state.busy = true;
    this.notify();
    try {
      await action();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : "Calibration operation failed";
      throw error;
    } finally {
      this.state.busy = false;
      this.notify();
    }
  }

  async save(): Promise<void> {
    if (this.state.mode !== "editing") throw new Error("Start editing before saving");
    // Validate the display again: never mark stale coordinates as calibrated.
    if (displayKey(this.selectedDisplay()) !== displayKey(this.state.profile.display))
      throw new Error("Display changed while editing; recalibrate");
    const candidate = saveProfile(
      { ...this.workspace, preferences: this.preferences() },
      this.state.profile,
      this.template(),
    );
    await this.transaction(async () => {
      await this.storage.save(candidate);
      this.workspace = candidate;
      this.previousProfile = structuredClone(this.state.profile);
      this.state.requiresCalibration = false;
      this.state.error = undefined;
      // A display event can arrive while disk I/O is pending.
      const display = this.state.displays.find((item) => item.id === this.state.selectedDisplayId);
      if (!display || displayKey(display) !== displayKey(this.state.profile.display)) {
        this.state.requiresCalibration = true;
        this.setMode("hidden");
        this.state.error = "Display changed during save. Recalibrate before preview.";
      } else this.setMode("preview");
    });
  }

  async selectDisplay(id: number): Promise<void> {
    this.idle();
    const display = this.state.displays.find((item) => item.id === id);
    if (!display) throw new Error("Unknown display");
    if (this.state.mode === "editing") this.cancel();
    this.setMode("hidden");
    this.state.selectedDisplayId = id;
    this.useProfile(this.template(), display);
    this.platform.setBounds(display);
    this.notify();
  }

  private useProfile(template: LayoutTemplate, display: DisplaySnapshot): void {
    const saved = this.findProfile(template, display);
    this.state.profile = saved ?? createCalibrationProfile(template, display);
    this.previousProfile = structuredClone(this.state.profile);
    this.state.requiresCalibration = !saved;
    if (!this.state.recoveryRequired) this.state.error = undefined;
  }

  async selectLayout(key: string): Promise<void> {
    this.idle();
    if (this.state.mode === "editing") throw new Error("Save or cancel editing first");
    const template = this.workspace.templates.find((item) => layoutKey(item) === key);
    if (!template) throw new Error("Unknown layout version");
    this.selectedDisplay();
    const candidate = workspaceSchema.parse({
      ...this.workspace,
      preferences: {
        ...this.preferences(),
        layoutId: template.layoutId,
        geometryVersion: template.geometryVersion,
      },
    });
    await this.transaction(async () => {
      await this.storage.save(candidate);
      this.workspace = candidate;
      this.setMode("hidden");
      this.state.activeLayoutKey = key;
      const current = this.state.displays.find((item) => item.id === this.state.selectedDisplayId);
      if (current) this.useProfile(template, current);
      else {
        this.state.requiresCalibration = true;
        this.state.error = "Selected display is unavailable. Choose a display and recalibrate.";
      }
    });
  }

  refreshDisplays(displays: DisplaySnapshot[]): void {
    this.state.displays = structuredClone(displays);
    const selected = displays.find((item) => item.id === this.state.selectedDisplayId);
    if (!selected || displayKey(selected) !== displayKey(this.state.profile.display)) {
      // Keep the in-flight save's profile stable; it is never shown on an incompatible screen.
      if (this.state.mode === "editing" && !this.state.busy)
        this.state.profile = structuredClone(this.previousProfile);
      this.setMode("hidden");
      this.state.requiresCalibration = true;
      this.state.error = "Display settings changed. Select a display and recalibrate.";
    }
    this.notify();
  }

  rendererStopped(): void {
    this.setMode("hidden");
    this.state.error = "Overlay renderer stopped. Restart the application to try again.";
    this.notify();
  }

  async chooseImport(): Promise<void> {
    if (this.state.mode === "editing") throw new Error("Save or cancel editing before importing");
    await this.transaction(async () => {
      this.setMode("hidden");
      this.state.pendingImport = undefined;
      const input = await this.platform.chooseImport();
      if (input === undefined) return;
      const merged = mergeTemplate(this.workspace.templates, input);
      this.state.pendingImport = { template: merged.template, kind: merged.kind };
    });
  }

  async confirmImport(): Promise<void> {
    const pending = this.state.pendingImport;
    if (!pending) throw new Error("No import is awaiting confirmation");
    const merged = mergeTemplate(this.workspace.templates, pending.template);
    const candidate = workspaceSchema.parse({
      ...this.workspace,
      templates: merged.templates,
      preferences: this.preferences(),
    });
    await this.transaction(async () => {
      await this.storage.save(candidate);
      this.workspace = candidate;
      this.state.templates = structuredClone(merged.templates);
      this.state.pendingImport = undefined;
      this.state.error = undefined;
    });
  }

  cancelImport(): void {
    this.idle();
    this.state.pendingImport = undefined;
    this.notify();
  }

  async reset(): Promise<void> {
    await this.transaction(async () => {
      this.setMode("hidden");
      if (!(await this.platform.confirmReset())) return;
      this.workspace = workspaceSchema.parse(await this.storage.reset(true));
      this.state.templates = structuredClone(this.workspace.templates);
      this.state.activeLayoutKey = layoutKey(this.template());
      this.state.recoveryRequired = false;
      this.state.pendingImport = undefined;
      const display =
        this.state.displays.find((item) => item.id === this.state.selectedDisplayId) ??
        this.state.displays[0];
      if (display) {
        this.state.selectedDisplayId = display.id;
        this.useProfile(this.template(), display);
      }
    });
  }
}
