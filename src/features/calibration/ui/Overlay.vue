<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  applyCalibrationGesture,
  setSlotEnabled,
  targetRectangle,
  type GeometryHandle,
  type GeometryTarget,
} from "../domain/calibration-editor";
import type { Point } from "../domain/calibration-geometry";
import { pageIds, type CalibrationProfile, type PageId } from "../domain/calibration-layout";
import { buildCalibrationScene } from "../domain/calibration-scene";
import type { DesktopState } from "../contracts";
import { acceptDesktopSnapshot, saveEditedProfile } from "../domain/calibration-snapshot";
defineOptions({ name: "CalibrationOverlay" });

const api = window.calibration;
const state = ref<DesktopState>();
const svg = ref<SVGSVGElement>();
const error = ref("");
const saving = ref(false);
const selected = ref<GeometryTarget>({ kind: "inventory" });
let unsubscribe: (() => void) | undefined;
let drag:
  | {
      pointer: number;
      target: GeometryTarget;
      handle: GeometryHandle;
      origin: Point;
      initial: CalibrationProfile;
    }
  | undefined;
let pendingUpdates = 0;
let pendingUpdate: Promise<void> = Promise.resolve();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const editing = computed(() => state.value?.mode === "editing");
const scene = computed(() => (state.value ? buildCalibrationScene(state.value) : undefined));
const cells = computed(() => scene.value?.inventory ?? []);
const slots = computed(() => scene.value?.slots ?? []);
const selection = computed(() => {
  if (!state.value || !editing.value) return undefined;
  if (selected.value.kind === "inventory" && !state.value.inventoryVisible) return undefined;
  if (
    selected.value.kind !== "inventory" &&
    (!state.value.stashVisible || selected.value.page !== state.value.page)
  )
    return undefined;
  return targetRectangle(state.value.profile, selected.value);
});
const handles = computed(() => {
  const rectangle = selection.value;
  if (!rectangle) return [];
  return [
    { id: "nw" as const, x: rectangle.x, y: rectangle.y },
    { id: "ne" as const, x: rectangle.x + rectangle.width, y: rectangle.y },
    { id: "sw" as const, x: rectangle.x, y: rectangle.y + rectangle.height },
    { id: "se" as const, x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
  ];
});
const selectedSlot = computed(() =>
  selected.value.kind === "slot" && selected.value.page === state.value?.page
    ? slots.value.find((slot) => slot.id === (selected.value as { slotId: string }).slotId)
    : undefined,
);

function accept(next: DesktopState): void {
  next = acceptDesktopSnapshot(state.value, next, Boolean(drag || pendingUpdates));
  if (next === state.value) return;
  if (
    state.value &&
    (next.page !== state.value.page || next.activeLayoutKey !== state.value.activeLayoutKey)
  ) {
    selected.value = next.inventoryVisible
      ? { kind: "inventory" }
      : { kind: "page", page: next.page };
  }
  if (
    selected.value.kind === "slot" &&
    !next.profile.pages[selected.value.page].slots.some(
      (slot) => slot.id === (selected.value as { slotId: string }).slotId,
    )
  ) {
    selected.value = { kind: "page", page: next.page };
  }
  if (next.mode !== "editing") drag = undefined;
  state.value = next;
}
async function perform(action: () => Promise<unknown>): Promise<void> {
  error.value = "";
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
function enqueueProfile(): void {
  if (!state.value) return;
  const profile = clone(state.value.profile);
  pendingUpdates++;
  pendingUpdate = pendingUpdate
    .catch(() => undefined)
    .then(() => api.updateProfile(profile))
    .finally(() => {
      pendingUpdates--;
    });
  void pendingUpdate
    .then(async () => {
      if (!pendingUpdates && !drag) accept(await api.getState());
    })
    .catch((cause) => {
      error.value = cause instanceof Error ? cause.message : String(cause);
    });
}
function point(event: PointerEvent): Point {
  const transform = svg.value?.getScreenCTM();
  if (!svg.value || !transform) throw new Error("Overlay coordinate transform is unavailable");
  const input = svg.value.createSVGPoint();
  input.x = event.clientX;
  input.y = event.clientY;
  const output = input.matrixTransform(transform.inverse());
  return { x: output.x, y: output.y };
}
function start(event: PointerEvent, target: GeometryTarget, handle: GeometryHandle = "move"): void {
  if (!editing.value || !state.value || state.value.busy || saving.value || event.button !== 0)
    return;
  event.preventDefault();
  event.stopPropagation();
  selected.value = target;
  error.value = "";
  drag = {
    pointer: event.pointerId,
    target,
    handle,
    origin: point(event),
    initial: clone(state.value.profile),
  };
  svg.value?.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent): void {
  if (!drag || drag.pointer !== event.pointerId || !state.value) return;
  const current = point(event);
  state.value.profile = applyCalibrationGesture(drag.initial, drag.target, drag.handle, {
    x: current.x - drag.origin.x,
    y: current.y - drag.origin.y,
  });
}
function finish(event: PointerEvent): void {
  if (!drag || drag.pointer !== event.pointerId) return;
  move(event);
  drag = undefined;
  if (svg.value?.hasPointerCapture(event.pointerId))
    svg.value.releasePointerCapture(event.pointerId);
  enqueueProfile();
}
function abortGesture(): void {
  if (!drag || !state.value) return;
  state.value.profile = drag.initial;
  const pointer = drag.pointer;
  drag = undefined;
  if (svg.value?.hasPointerCapture(pointer)) svg.value.releasePointerCapture(pointer);
}
function cancel(): void {
  abortGesture();
  void perform(async () => {
    await pendingUpdate.catch(() => undefined);
    await api.cancel();
  });
}
function save(): void {
  if (!state.value || saving.value) return;
  if (drag) {
    const pointer = drag.pointer;
    drag = undefined;
    if (svg.value?.hasPointerCapture(pointer)) svg.value.releasePointerCapture(pointer);
  }
  const visibleProfile = clone(state.value.profile);
  saving.value = true;
  void perform(async () => {
    try {
      await saveEditedProfile(api, pendingUpdate, visibleProfile);
      accept(await api.getState());
    } finally {
      saving.value = false;
    }
  });
}
function toggleSlot(): void {
  if (!state.value || selected.value.kind !== "slot" || !selectedSlot.value) return;
  state.value.profile = setSlotEnabled(
    clone(state.value.profile),
    selected.value.page,
    selected.value.slotId,
    !selectedSlot.value.enabled,
  );
  enqueueProfile();
}
function changePage(event: Event): void {
  const page = (event.target as HTMLSelectElement).value as PageId;
  abortGesture();
  selected.value = { kind: "page", page };
  void perform(async () => {
    await pendingUpdate;
    await api.selectPage(page);
  });
}
function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape" && editing.value) {
    event.preventDefault();
    cancel();
  }
}
onMounted(() => {
  unsubscribe = api.onState(accept);
  window.addEventListener("keydown", onKey);
  void perform(async () => accept(await api.getState()));
});
onUnmounted(() => {
  unsubscribe?.();
  window.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div class="overlay-root">
    <svg
      v-if="state"
      ref="svg"
      class="calibration-overlay"
      :viewBox="`0 0 ${state.profile.display.bounds.width} ${state.profile.display.bounds.height}`"
      aria-label="Calibration overlay"
      @pointermove="move"
      @pointerup="finish"
      @pointercancel="abortGesture"
      @lostpointercapture="abortGesture"
    >
      <g v-if="state.inventoryVisible" class="inventory">
        <rect
          v-bind="state.profile.inventory"
          class="surface-frame"
          :class="{ 'drag-frame': editing }"
          @pointerdown="start($event, { kind: 'inventory' })"
        />
        <g class="grid-cells"><rect v-for="(cell, index) in cells" :key="index" v-bind="cell" /></g>
        <text
          :x="state.profile.inventory.x"
          :y="state.profile.inventory.y - 10"
          @pointerdown="start($event, { kind: 'inventory' })"
        >
          Inventory · 12 × 5
        </text>
      </g>
      <g v-if="state.stashVisible" class="stash">
        <rect
          v-bind="state.profile.pages[state.page].area"
          class="surface-frame"
          :class="{ 'drag-frame': editing }"
          @pointerdown="start($event, { kind: 'page', page: state.page })"
        />
        <g v-for="slot in slots" :key="slot.id" :class="{ disabled: !slot.enabled }">
          <rect
            v-bind="slot.rectangle"
            class="slot-shape"
            :class="{ 'editable-slot': editing }"
            @pointerdown="start($event, { kind: 'slot', page: state.page, slotId: slot.id })"
          >
            <title>{{ slot.label }} · {{ slot.id }}</title>
          </rect>
          <text
            :x="slot.rectangle.x + 3"
            :y="slot.rectangle.y + slot.rectangle.height / 2 + 4"
            class="slot-label"
          >
            {{ slot.label.slice(0, 16) }}
          </text>
        </g>
        <text
          :x="state.profile.pages[state.page].area.x"
          :y="state.profile.pages[state.page].area.y - 10"
          @pointerdown="start($event, { kind: 'page', page: state.page })"
        >
          {{ state.page }} · рамка стеша
        </text>
      </g>
      <g v-if="selection" class="selection">
        <rect v-bind="selection" class="selection-outline" />
        <rect
          v-for="handle in handles"
          :key="handle.id"
          :x="handle.x - 6"
          :y="handle.y - 6"
          width="12"
          height="12"
          class="resize-handle"
          :style="{ cursor: `${handle.id}-resize` }"
          @pointerdown="start($event, selected, handle.id)"
        />
      </g>
    </svg>
    <section v-if="editing && state" class="overlay-toolbar">
      <strong>Калибровка</strong>
      <select
        :value="state.page"
        :disabled="state.busy || saving"
        aria-label="Страница стеша"
        @change="changePage"
      >
        <option v-for="page in pageIds" :key="page" :value="page">{{ page }}</option>
      </select>
      <button :disabled="state.busy || saving" @click="save">Сохранить</button
      ><button :disabled="state.busy || saving" @click="cancel">Отмена · Esc</button>
      <p>Двигайте рамку за фон или заголовок. Выберите слот и тяните углы для точной настройки.</p>
      <div v-if="selectedSlot" class="slot-control">
        <span>{{ selectedSlot.label }} · {{ selectedSlot.id }}</span
        ><button :disabled="state.busy" @click="toggleSlot">
          {{ selectedSlot.enabled ? "Отключить слот" : "Включить слот" }}
        </button>
      </div>
      <p v-if="error || state.error" role="alert">{{ error || state.error }}</p>
    </section>
    <p v-else-if="error" class="overlay-error" role="alert">{{ error }}</p>
  </div>
</template>

<style>
.overlay-view,
.overlay-view body,
.overlay-view #app {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
}
.overlay-root {
  width: 100%;
  height: 100%;
  font:
    14px system-ui,
    sans-serif;
  color: #e9dbbe;
}
.calibration-overlay {
  display: block;
  width: 100vw;
  height: 100vh;
  touch-action: none;
  user-select: none;
}
.calibration-overlay rect {
  fill: none;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
.calibration-overlay .inventory {
  stroke: #5fffee;
}
.calibration-overlay .stash {
  stroke: #ffd05c;
}
.calibration-overlay .grid-cells,
.calibration-overlay .slot-label,
.calibration-overlay .selection-outline {
  pointer-events: none;
}
.calibration-overlay .surface-frame {
  fill: #ffffff06;
  stroke-dasharray: 6 4;
}
.calibration-overlay .slot-shape {
  fill: #ffd05c14;
}
.calibration-overlay .drag-frame,
.calibration-overlay .editable-slot {
  cursor: move;
}
.calibration-overlay .disabled {
  opacity: 0.4;
  stroke-dasharray: 3 3;
}
.calibration-overlay .selection-outline {
  stroke: #fff;
  stroke-width: 2;
}
.calibration-overlay .resize-handle {
  fill: #fff;
  stroke: #171411;
}
.calibration-overlay text {
  fill: white;
  stroke: #000;
  stroke-width: 3px;
  paint-order: stroke;
  font:
    14px system-ui,
    sans-serif;
  cursor: move;
}
.calibration-overlay .slot-label {
  font-size: 11px;
}
.overlay-toolbar,
.overlay-error {
  position: fixed;
  top: 12px;
  left: 12px;
  max-width: min(640px, calc(100vw - 48px));
  padding: 12px;
  background: #171411f2;
  border: 1px solid #aa8747;
  border-radius: 6px;
  box-shadow: 0 4px 20px #0006;
}
.overlay-toolbar button,
.overlay-toolbar select {
  font: inherit;
  padding: 6px 10px;
  margin-left: 8px;
  background: #29251e;
  border: 1px solid #88754e;
  color: #f0e3c4;
  border-radius: 4px;
}
.overlay-toolbar button {
  cursor: pointer;
}
.overlay-toolbar p {
  margin: 10px 0 0;
  line-height: 1.4;
}
.overlay-toolbar [role="alert"],
.overlay-error {
  color: #ffaaa1;
  overflow-wrap: anywhere;
}
.overlay-toolbar .slot-control {
  margin-top: 12px;
}
</style>
