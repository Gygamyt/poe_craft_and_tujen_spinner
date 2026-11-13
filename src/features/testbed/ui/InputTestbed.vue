<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ObservedEvent, TestbedCommand, TestbedState } from "../contracts";
import { fixtureInventoryArea, footprintPresets } from "../domain/fixture";
import { inventoryCells } from "../../calibration";
const preset = ref<keyof typeof footprintPresets>("1x1");
const column = ref(0),
  row = ref(0),
  obstacle = ref(false);

const state = ref<TestbedState>();
const error = ref("");
const seed = ref(1);
const selected = ref("general/slot-001");
let unsubscribe = () => {};
const currencies = computed(
  () => state.value?.targets.filter((target) => target.kind === "currency") ?? [],
);
const recent = computed(() => state.value?.trace.slice(-6).reverse() ?? []);
const cells = computed(() =>
  state.value ? inventoryCells(fixtureInventoryArea(state.value.viewport)) : [],
);
function accept(value: TestbedState) {
  if (state.value?.fixture.epoch !== value.fixture.epoch) {
    const placement = value.fixture.item.placement;
    preset.value = `${placement.width}x${placement.height}` as keyof typeof footprintPresets;
    column.value = placement.column;
    row.value = placement.row;
    obstacle.value = value.fixture.obstacle;
  }
  state.value = value;
  if (!value.targets.some((target) => target.id === selected.value))
    selected.value = value.targets.find((target) => target.kind === "currency")?.id ?? "";
}
async function command(value: TestbedCommand) {
  error.value = "";
  try {
    await window.testbed.command(value);
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure);
  }
}
function run(targetId: string, button: "primary" | "secondary", shift = false) {
  void command({ kind: "run", targetId, button, shift, seed: seed.value });
}
function receive(event: Event) {
  if (!state.value) return;
  const keyboard = event as KeyboardEvent;
  if (event.type.startsWith("key") && !["Shift", "Escape"].includes(keyboard.key)) return;
  const pointer = event as PointerEvent;
  const value: ObservedEvent = {
    type: event.type as ObservedEvent["type"],
    x: pointer.clientX ?? 0,
    y: pointer.clientY ?? 0,
    button: pointer.button ?? -1,
    shift: pointer.shiftKey ?? keyboard.shiftKey,
    key: keyboard.key ?? "",
    trusted: event.isTrusted,
    runId: state.value.activeRun,
    epoch: state.value.fixture.epoch,
  };
  window.testbed.observed(value);
  if (event.type === "keydown" && keyboard.key === "Escape") void command({ kind: "stop" });
}
const types = ["pointermove", "pointerdown", "pointerup", "keydown", "keyup"];
onMounted(async () => {
  unsubscribe = window.testbed.onState(accept);
  accept(await window.testbed.getState());
  for (const type of types) window.addEventListener(type, receive);
});
onUnmounted(() => {
  unsubscribe();
  for (const type of types) window.removeEventListener(type, receive);
});
function slotStyle(bounds: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
  };
}
</script>

<template>
  <main v-if="state" class="testbed" @contextmenu.prevent>
    <header>
      <strong>Стенд ввода · синтетические данные</strong>
      <span
        :class="{ error: state.status.includes('failed') || state.status.includes('unconfirmed') }"
        >{{ state.status }}</span
      >
      <div class="controls">
        <label
          >Seed
          <input
            v-model.number="seed"
            type="number"
            min="0"
            max="4294967295"
            :disabled="state.busy"
        /></label>
        <button :disabled="state.busy" @click="command({ kind: 'reset', seed })">Сброс</button>
        <select
          :value="state.fault"
          :disabled="state.busy"
          @change="
            command({
              kind: 'fault',
              fault: ($event.target as HTMLSelectElement).value as TestbedState['fault'],
            })
          "
        >
          <option value="none">Обычное наблюдение</option>
          <option value="delayed">Задержка наблюдения</option>
          <option value="missing">Нет подтверждения</option>
        </select>
        <button @click="command({ kind: 'stop' })">Стоп / Escape</button>
        <button @click="command({ kind: 'export' })">Экспорт журнала</button>
      </div>
      <div class="controls">
        <button
          v-for="page in ['general', 'atlas', 'league'] as const"
          :key="page"
          :disabled="state.busy"
          :class="{ active: state.fixture.page === page }"
          @click="command({ kind: 'page', page })"
        >
          {{ page }}
        </button>
        <select v-model="selected" :disabled="state.busy">
          <option v-for="target in currencies" :key="target.id" :value="target.id">
            {{ target.label }}
          </option>
        </select>
        <button
          :disabled="state.busy"
          @click="
            command({
              kind: 'toggle',
              targetId: selected,
              enabled: state.fixture.disabled.includes(selected),
            })
          "
        >
          Вкл./выкл. слот
        </button>
        <button :disabled="state.busy" @click="run(selected, 'secondary')">
          Выбрать валюту · ПКМ
        </button>
        <button :disabled="state.busy" @click="run('inventory-0', 'primary')">
          Применить · ЛКМ
        </button>
        <button :disabled="state.busy" @click="run('inventory-0', 'primary', true)">
          Shift + ЛКМ
        </button>
      </div>
      <div class="controls">
        <label
          >Предмет
          <select v-model="preset">
            <option v-for="(_, key) in footprintPresets" :key="key" :value="key">{{ key }}</option>
          </select></label
        >
        <label
          >Колонка (0–11) <input v-model.number="column" type="number" min="0" max="11"
        /></label>
        <label>Строка (0–4) <input v-model.number="row" type="number" min="0" max="4" /></label>
        <label><input v-model="obstacle" type="checkbox" />Препятствие (10,3), 2×2</label>
        <button @click="command({ kind: 'placement', preset, column, row, obstacle })">
          Разместить / остановить ввод
        </button>
      </div>
      <p>
        Настройки игры не используются. Держи курсор внутри окна; смена фокуса останавливает ввод.
      </p>
      <p class="error">{{ error }}</p>
    </header>
    <div
      v-for="(cell, index) in cells"
      :key="`cell-${index}`"
      class="inventory-cell"
      :style="slotStyle(cell)"
    >
      {{ index + 1 }}
    </div>
    <div
      v-for="target in state.targets"
      :key="target.id"
      class="slot"
      :class="[
        target.kind,
        { disabled: !target.enabled, chosen: state.fixture.selected === target.id },
      ]"
      :style="slotStyle(target.bounds)"
    >
      <span>{{ target.label }}</span><small v-if="target.kind === 'currency'">{{
        state.fixture.balances[target.id]
      }}</small>
    </div>
    <aside>
      <p>
        Предмет v{{ state.fixture.item.version }} · {{ state.fixture.item.modifiers.join(", ") }}
      </p>
      <p>Валюта: {{ state.fixture.selected ?? "не выбрана" }}</p>
      <button :disabled="state.busy" @click="command({ kind: 'suite' })">
        Native-проверки: ввод, фокус, закрытие
      </button>
      <small
        >Проверки двигают курсор, переключают окна и закрывают стенд. Запускай отдельно от ручных
        действий.</small
      >
      <pre v-for="(entry, index) in recent" :key="index"
        >{{ entry.runId }} / {{ entry.phase }}: {{ JSON.stringify(entry.data).slice(0, 180) }}</pre>
    </aside>
  </main>
</template>

<style scoped>
.inventory-cell {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid #444;
  color: #777;
  font-size: 10px;
  pointer-events: none;
}
.inventory {
  z-index: 1;
  box-sizing: border-box;
}
.testbed {
  user-select: none;
  position: fixed;
  inset: 0;
  background: #171411;
  color: #eee0c4;
  font: 13px system-ui;
  overflow: hidden;
}
header {
  padding: 12px 15px;
}
header strong {
  font-size: 17px;
  margin-right: 20px;
}
.controls {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 10px;
}
input {
  user-select: text;
  width: 85px;
}
input[type="checkbox"] {
  width: auto;
}
button,
select,
input {
  background: #30291f;
  border: 1px solid #756448;
  color: inherit;
  border-radius: 4px;
  padding: 5px;
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
.active {
  border-color: #e6bd70;
}
p {
  margin: 8px 0;
}
.slot {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid #57c6c0;
  background: #173433;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 9px;
  user-select: none;
  pointer-events: none;
}
.currency {
  border-color: #dcc26a;
  background: #38321c;
  flex-direction: column;
}
.disabled {
  opacity: 0.22;
}
.chosen {
  outline: 2px solid #fff;
}
.error {
  color: #ffa492;
}
aside {
  position: absolute;
  left: 51%;
  right: 12px;
  top: 470px;
}
aside small {
  display: block;
  margin-top: 8px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 10px;
  margin: 7px 0;
  color: #b6b1a8;
}
</style>
