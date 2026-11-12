import { describe, expect, it, vi } from "vitest";
import { applyOverlayMode } from "../src/main/overlay-mode";

describe("overlay input mode", () => {
  it("releases keyboard focus and mouse capture when leaving editing", () => {
    const window = {
      hide: vi.fn(),
      show: vi.fn(),
      showInactive: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      setFocusable: vi.fn(),
      setIgnoreMouseEvents: vi.fn(),
    };
    applyOverlayMode(window, "editing");
    applyOverlayMode(window, "preview");
    expect(window.setIgnoreMouseEvents.mock.calls).toEqual([[false], [true]]);
    expect(window.setFocusable.mock.calls).toEqual([[true], [false]]);
    expect(window.blur).toHaveBeenCalledOnce();
    expect(window.showInactive).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    applyOverlayMode(window, "hidden");
    expect(window.hide).toHaveBeenCalledOnce();
    expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(true);
  });
});
