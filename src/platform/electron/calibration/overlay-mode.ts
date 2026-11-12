import type { OverlayMode } from "../../../features/calibration/contracts";

export interface OverlayWindowPort {
  hide(): void;
  show(): void;
  showInactive(): void;
  focus(): void;
  blur(): void;
  setFocusable(value: boolean): void;
  setIgnoreMouseEvents(value: boolean): void;
}

/** Keep native focus and pointer capture consistent with the visible editing mode. */
export function applyOverlayMode(window: OverlayWindowPort, mode: OverlayMode): void {
  if (mode === "editing") {
    window.setFocusable(true);
    window.setIgnoreMouseEvents(false);
    window.show();
    window.focus();
    return;
  }
  window.setIgnoreMouseEvents(true);
  window.blur();
  window.setFocusable(false);
  if (mode === "preview") window.showInactive();
  else window.hide();
}
