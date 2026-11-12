<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { DesktopState } from "../../domain/desktop-api";
import { pageIds, type PageId } from "../../domain/calibration-layout";

const state = ref<DesktopState>();
const page = ref<PageId>("general");
const error = ref("");
let unsubscribe: (() => void) | undefined;

async function run(action: () => Promise<unknown>): Promise<void> {
  try {
    error.value = "";
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
const preview = () => run(() => window.calibration.preview(page.value));
const hide = () => run(() => window.calibration.hide());

onMounted(() => {
  unsubscribe = window.calibration.onState((next) => {
    state.value = next;
  });
  void run(async () => {
    state.value = await window.calibration.getState();
  });
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <main>
    <h1>PoE Autocraft</h1>
    <h2>Проверка оверлея</h2>
    <p>Тестовая разметка: инвентарь 12 × 5 и выбранная страница стеша.</p>
    <label
      >Страница стеша
      <select v-model="page">
        <option v-for="id in pageIds" :key="id" :value="id">{{ id }}</option>
      </select>
    </label>
    <div class="actions">
      <button :disabled="!state" @click="preview">Показать тестовую разметку</button>
      <button :disabled="!state" @click="hide">Скрыть</button>
    </div>
    <p v-if="state">
      Монитор {{ state.profile.display.id }} · {{ state.profile.display.bounds.width }} ×
      {{ state.profile.display.bounds.height }} DIP · масштаб {{ state.profile.display.scaleFactor
      }}<br />Оверлей {{ state.visible ? "показан" : "скрыт" }}
    </p>
    <p class="hint">
      Разметка пока не двигается и не сохраняется. Она пропускает мышь; вернуться к управлению можно
      через Alt+Tab. Проверьте видимость поверх игры в оконном и безрамочном режиме.
    </p>
    <p class="hint">
      Переключение страниц вручную. Эксклюзивный полноэкранный режим не поддерживается.
    </p>
    <p v-if="error || state?.error" role="alert">{{ error || state?.error }}</p>
  </main>
</template>

<style>
.main-view {
  font-family: system-ui, sans-serif;
  color: #e9dbbe;
  background: #171411;
  color-scheme: dark;
}
body {
  margin: 0;
}
.main-view main {
  max-width: 720px;
  padding: 2.5rem;
}
.main-view h1 {
  font-family: Georgia, serif;
}
.main-view h2 {
  font-size: 1.2rem;
  font-weight: 500;
}
.main-view label {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.main-view select,
.main-view button {
  font: inherit;
  padding: 0.6rem 0.8rem;
}
.main-view .actions {
  display: flex;
  gap: 0.75rem;
  margin: 1.5rem 0;
}
.main-view .hint {
  color: #b5aa95;
  line-height: 1.6;
}
.main-view [role="alert"] {
  color: #ff9c9c;
}
</style>
