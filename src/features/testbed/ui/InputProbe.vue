<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
const status = ref("Ready — this is an instantaneous native click, not a motion demonstration.");
const started = ref(false);
let unsubscribe = () => {};
const start = async () => {
  started.value = true;
  status.value = "Checking native input…";
  try {
    await window.inputProbe.ready();
  } catch (error) {
    status.value = String(error);
  }
};
const receive = (event: Event) => {
  const pointer = event as MouseEvent;
  window.inputProbe.received({
    type: pointer.type,
    button: pointer.button,
    x: pointer.clientX,
    y: pointer.clientY,
    trusted: pointer.isTrusted,
  });
};
const types = ["pointerdown", "pointerup", "click"];

onMounted(() => {
  unsubscribe = window.inputProbe.onResult((result) => {
    status.value = result.ok ? "Native click confirmed. Closing…" : `Failed: ${result.error}`;
  });
  for (const type of types) window.addEventListener(type, receive);
});
onUnmounted(() => {
  unsubscribe();
  for (const type of types) window.removeEventListener(type, receive);
});
</script>

<template>
  <main class="probe">
    <h1>Native input probe</h1>
    <p>One OS click inside this window. This window closes automatically.</p>
    <button :disabled="started" @click="start">Start native probe</button>
    <p>{{ status }}</p>
    <div class="target">+</div>
  </main>
</template>

<style scoped>
.probe {
  position: fixed;
  inset: 0;
  background: #171411;
  color: #f5dfaf;
  padding: 24px;
  font-family: sans-serif;
}
.target {
  position: absolute;
  inset: 45% 45%;
  border: 2px solid #52ddd0;
  display: grid;
  place-items: center;
}
</style>
