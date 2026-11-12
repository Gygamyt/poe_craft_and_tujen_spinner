<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
defineOptions({ name: "CalibrationOverlay" });
import type { DesktopState } from "../../domain/desktop-api";
import { inventoryCells, materializeSlot } from "../../domain/calibration-geometry";

const state = ref<DesktopState>();
let unsubscribe: (() => void) | undefined;
const cells = computed(() => (state.value ? inventoryCells(state.value.profile.inventory) : []));
const slots = computed(() => {
  if (!state.value) return [];
  const page = state.value.profile.pages[state.value.page];
  return page.slots
    .filter((slot) => slot.enabled)
    .map((slot) => ({ id: slot.id, ...materializeSlot(page.area, slot.bounds) }));
});
onMounted(async () => {
  unsubscribe = window.calibration.onState((next) => {
    state.value = next;
  });
  state.value = await window.calibration.getState();
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <svg
    v-if="state"
    class="calibration-overlay"
    :viewBox="`0 0 ${state.profile.display.bounds.width} ${state.profile.display.bounds.height}`"
    aria-label="Calibration overlay"
  >
    <g class="inventory"><rect v-for="(cell, index) in cells" :key="index" v-bind="cell" /></g>
    <g class="stash">
      <rect
        v-for="slot in slots"
        :key="slot.id"
        :x="slot.x"
        :y="slot.y"
        :width="slot.width"
        :height="slot.height"
      />
    </g>
    <text :x="state.profile.inventory.x" :y="state.profile.inventory.y - 12">Inventory · test</text>
    <text
      :x="state.profile.pages[state.page].area.x"
      :y="state.profile.pages[state.page].area.y - 12"
    >
      {{ state.page }} · test · Alt+Tab to controls
    </text>
  </svg>
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
.calibration-overlay {
  display: block;
  width: 100vw;
  height: 100vh;
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
.calibration-overlay text {
  fill: white;
  stroke: #000;
  stroke-width: 3px;
  paint-order: stroke;
  font:
    14px system-ui,
    sans-serif;
}
</style>
