import { inventoryCells, materializeSlot } from "./calibration-geometry";
import { slotLabel } from "./calibration-layout";
import { layoutKey } from "./calibration-workspace";
import type { DesktopState } from "../contracts";

/** Both modes draw the same scene; editing only adds disabled slots and manipulation UI. */
export function buildCalibrationScene(state: DesktopState) {
  const page = state.profile.pages[state.page];
  const template = state.templates.find((item) => layoutKey(item) === state.activeLayoutKey);
  return {
    inventory: state.inventoryVisible ? inventoryCells(state.profile.inventory) : [],
    slots: state.stashVisible
      ? page.slots
          .filter((slot) => state.mode === "editing" || slot.enabled)
          .map((slot) => ({
            ...slot,
            rectangle: materializeSlot(page.area, slot.bounds),
            label: slotLabel(
              template?.pages[state.page].slots.find((item) => item.id === slot.id) ?? slot,
            ),
          }))
      : [],
  };
}
