<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { pageIds, type PageId } from "../../domain/calibration-layout";
import { layoutKey } from "../../domain/calibration-workspace";
import type { DesktopState } from "../../domain/desktop-api";
import { acceptDesktopSnapshot } from "../../domain/calibration-snapshot";

const state = ref<DesktopState>();
const error = ref("");
const pending = ref(false);
const page = ref<PageId>("general");
const selectedDisplay = ref<number>();
const selectedLayout = ref("");
const inventoryVisible = ref(true);
const stashVisible = ref(true);
let unsubscribe: (() => void) | undefined;

function accept(next: DesktopState): void {
  next = acceptDesktopSnapshot(state.value, next, false);
  state.value = next;
  page.value = next.page;
  selectedDisplay.value = next.selectedDisplayId;
  selectedLayout.value = next.activeLayoutKey;
  inventoryVisible.value = next.inventoryVisible;
  stashVisible.value = next.stashVisible;
}
async function run(action: () => Promise<unknown>): Promise<void> {
  if (pending.value) return;
  pending.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    pending.value = false;
  }
}
const api = window.calibration;
const selectPage = () => run(() => api.selectPage(page.value));
const selectDisplay = () => run(() => api.selectDisplay(selectedDisplay.value!));
const selectLayout = () => run(() => api.selectLayout(selectedLayout.value));
const setVisibility = () =>
  run(() => api.setVisibility(inventoryVisible.value, stashVisible.value));
onMounted(() => {
  unsubscribe = api.onState(accept);
  void run(async () => accept(await api.getState()));
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <main>
    <header>
      <h1>PoE Autocraft</h1>
      <span>Калибровка</span>
    </header>
    <fieldset :disabled="!state || state.busy || pending">
      <div class="fields">
        <label
          >Раскладка
          <select
            v-model="selectedLayout"
            :disabled="state?.mode === 'editing'"
            @change="selectLayout"
          >
            <option
              v-for="template in state?.templates ?? []"
              :key="layoutKey(template)"
              :value="layoutKey(template)"
            >
              {{ template.layoutId }} · v{{ template.geometryVersion
              }}{{ template.leagueLabel ? ` · ${template.leagueLabel}` : "" }}
            </option>
          </select>
        </label>
        <label
          >Монитор
          <select v-model="selectedDisplay" @change="selectDisplay">
            <option v-for="display in state?.displays ?? []" :key="display.id" :value="display.id">
              {{ display.id }} · {{ Math.round(display.bounds.width * display.scaleFactor) }} ×
              {{ Math.round(display.bounds.height * display.scaleFactor) }} ·
              {{ Math.round(display.scaleFactor * 100) }}%
            </option>
          </select>
        </label>
        <label
          >Страница стеша
          <select v-model="page" @change="selectPage">
            <option v-for="id in pageIds" :key="id" :value="id">{{ id }}</option>
          </select>
        </label>
      </div>
      <div class="visibility">
        <label
          ><input v-model="inventoryVisible" type="checkbox" @change="setVisibility" />Инвентарь 12
          × 5</label
        >
        <label
          ><input v-model="stashVisible" type="checkbox" @change="setVisibility" />Выбранная
          страница стеша</label
        >
      </div>
      <div class="actions">
        <button class="primary" :disabled="state?.recoveryRequired" @click="run(() => api.edit())">
          Редактировать
        </button>
        <button
          :disabled="state?.mode === 'editing' || state?.requiresCalibration"
          @click="run(() => api.preview(page))"
        >
          Просмотр
        </button>
        <button @click="run(() => api.hide())">Скрыть</button>
        <button v-if="state?.mode === 'editing'" @click="run(() => api.save())">Сохранить</button>
        <button v-if="state?.mode === 'editing'" @click="run(() => api.cancel())">Отмена</button>
        <button
          :disabled="state?.mode === 'editing' || state?.recoveryRequired"
          @click="run(() => api.chooseImport())"
        >
          Импорт раскладки…
        </button>
        <button :disabled="state?.mode === 'editing'" @click="run(() => api.reset())">
          Сбросить…
        </button>
      </div>
      <section v-if="state?.pendingImport" class="notice">
        <strong>{{
          state.pendingImport.kind === "new"
            ? "Новая версия раскладки"
            : "Обновление названий и метаданных"
        }}</strong>
        <p>
          {{ state.pendingImport.template.layoutId }} · v{{
            state.pendingImport.template.geometryVersion
          }}. Импорт не переключает активную раскладку.
        </p>
        <div class="actions">
          <button @click="run(() => api.confirmImport())">Подтвердить импорт</button
          ><button @click="run(() => api.cancelImport())">Отмена импорта</button>
        </div>
      </section>
    </fieldset>
    <p v-if="state?.requiresCalibration" class="notice">
      Для этой раскладки и параметров монитора нужна калибровка. Нажмите «Редактировать», совместите
      разметку и сохраните её.
    </p>
    <p v-if="error || state?.error" class="error" role="alert">{{ error || state?.error }}</p>
    <p v-if="state" class="status">
      Режим: {{ state.mode }}{{ state.busy ? " · выполняется операция…" : "" }}
    </p>
    <p class="hint">
      В редакторе двигайте рамку и тяните углы. Нажмите на слот для точной настройки или отключения.
      Сохранение и отмена доступны прямо в оверлее; Escape отменяет изменения.
    </p>
    <p class="hint">
      В просмотре разметка пропускает ввод в игру. Вернуться к панели можно через Alt+Tab.
      Используйте оконный безрамочный режим. После перемещения окна игры или изменения масштаба
      нужна повторная настройка; страницы переключаются вручную.
    </p>
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
  max-width: 1100px;
  padding: 1.5rem;
  box-sizing: border-box;
}
.main-view header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.main-view h1 {
  font:
    1.8rem Georgia,
    serif;
  margin: 0;
}
.main-view fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.main-view .fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.main-view .fields label {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.main-view select,
.main-view button {
  font: inherit;
  padding: 0.55rem 0.7rem;
  min-width: 0;
}
.main-view .visibility,
.main-view .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.25rem 0;
}
.main-view .visibility label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.main-view .primary {
  background: #d7b56d;
  color: #171411;
  border: 1px solid #d7b56d;
}
.main-view button {
  cursor: pointer;
  border-radius: 4px;
}
.main-view button:disabled {
  cursor: default;
}
.main-view .notice {
  border: 1px solid #735e36;
  padding: 0.85rem;
  line-height: 1.5;
  border-radius: 4px;
}
.main-view .hint {
  color: #b5aa95;
  line-height: 1.5;
  font-size: 0.9rem;
}
.main-view .error {
  color: #ffaaa1;
  overflow-wrap: anywhere;
}
.main-view .status {
  color: #e2c989;
}
</style>
