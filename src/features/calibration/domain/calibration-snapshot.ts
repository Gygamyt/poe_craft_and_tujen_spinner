import type { CalibrationDesktopApi, DesktopState } from "../contracts";
import type { CalibrationProfile } from "./calibration-layout";

/** Late getState replies must never replace a newer broadcast (especially after Save). */
export function acceptDesktopSnapshot(
  current: DesktopState | undefined,
  incoming: DesktopState,
  hasLocalGesture: boolean,
): DesktopState {
  if (current && incoming.revision < current.revision) return current;
  if (
    current?.mode === "editing" &&
    incoming.mode === "editing" &&
    hasLocalGesture &&
    current.activeLayoutKey === incoming.activeLayoutKey
  ) {
    return { ...incoming, profile: current.profile };
  }
  return incoming;
}

export async function saveEditedProfile(
  api: Pick<CalibrationDesktopApi, "updateProfile" | "save">,
  pendingUpdate: Promise<void>,
  visibleProfile: CalibrationProfile,
): Promise<void> {
  await pendingUpdate;
  await api.updateProfile(visibleProfile);
  await api.save();
}
