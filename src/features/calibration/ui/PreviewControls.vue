<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { DesktopState } from "../contracts";
import { acceptDesktopSnapshot } from "../domain/calibration-snapshot";

const state = ref<DesktopState>();
const pending = ref(false);
const error = ref("");
let unsubscribe: (() => void) | undefined;
function accept(next: DesktopState): void {
  state.value = acceptDesktopSnapshot(state.value, next, false);
}
async function hide(): Promise<void> {
  pending.value = true;
  error.value = "";
  try {
    await window.calibration.hide();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    pending.value = false;
  }
}
onMounted(async () => {
  unsubscribe = window.calibration.onState(accept);
  try {
    accept(await window.calibration.getState());
  } catch {
    error.value = "Не удалось загрузить состояние";
  }
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div class="preview-control-bar">
    <div>
      <strong>Просмотр</strong
      ><small :title="error">{{ error || state?.page || "Разметка" }}</small>
    </div>
    <button :disabled="pending || state?.busy" @click="hide">Скрыть</button>
  </div>
</template>

<style>
.preview-controls-view,
.preview-controls-view body,
.preview-controls-view #app {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #171411;
  color: #e9dbbe;
  font:
    14px system-ui,
    sans-serif;
}
.preview-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
  padding: 10px 12px;
  border: 1px solid #aa8747;
  box-sizing: border-box;
}
.preview-control-bar div {
  min-width: 0;
}
.preview-control-bar small {
  display: block;
  margin-top: 3px;
  color: #b5aa95;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.preview-control-bar button {
  font: inherit;
  padding: 8px 14px;
  background: #29251e;
  border: 1px solid #88754e;
  color: #f0e3c4;
  border-radius: 4px;
  cursor: pointer;
}
</style>
