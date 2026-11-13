<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { BaseDimensions } from "../index";
const dimensions = ref<BaseDimensions>();
import type { CatalogStatus, CatalogQueryResult, CatalogDetail } from "../contracts";
const status = ref<CatalogStatus>();
const results = ref<CatalogQueryResult>();
const detail = ref<CatalogDetail>();
const snapshot = ref("");
const kind = ref<"base" | "mod">("base");
const resultKind = ref<"base" | "mod">("base");
const text = ref("");
const itemClass = ref("");
const domain = ref("");
const tag = ref("");
const offset = ref(0);
const busy = ref(false);
const error = ref("");
const message = ref("");
const api = window.catalog;
async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause) {
    error.value = String(cause);
  } finally {
    busy.value = false;
  }
}
function accept(value: CatalogStatus) {
  status.value = value;
  snapshot.value = value.activeSnapshotId ?? "";
  results.value = undefined;
  dimensions.value = undefined;
  detail.value = undefined;
  offset.value = 0;
}
const refresh = () => run(async () => accept(await api.status()));
const activate = () => run(async () => accept(await api.activate(snapshot.value)));
const importBundle = () =>
  run(async () => {
    const value = await api.chooseImport();
    if (!value.canceled && value.status) {
      accept(value.status);
      message.value = `Импорт: ${value.importMs} ms`;
    }
  });
function search(start = 0) {
  return run(async () => {
    const selectedKind = kind.value;
    results.value = await api.query({
      kind: selectedKind,
      snapshotId: snapshot.value,
      text: text.value,
      itemClass: selectedKind === "base" ? itemClass.value || undefined : undefined,
      domain: domain.value || undefined,
      tag: tag.value || undefined,
      offset: start,
      limit: 30,
    });
    resultKind.value = selectedKind;
    offset.value = start;
    detail.value = undefined;
    dimensions.value = undefined;
  });
}
function inspect(selectedKind: "base" | "mod", id: string) {
  return run(async () => {
    detail.value = await api.detail(selectedKind, id, results.value?.snapshotId ?? snapshot.value);
    dimensions.value = undefined;
    if (selectedKind === "base")
      dimensions.value = await api.dimensions(id, detail.value.snapshotId);
  });
}
onMounted(refresh);
</script>

<template>
  <main>
    <h1>Каталог игровых данных</h1>
    <p>Факты из источника. Допустимость модов и вероятность крафта здесь не рассчитываются.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message">{{ message }}</p>
    <p v-if="busy" role="status">Выполняется…</p>
    <fieldset :disabled="busy">
      <button @click="importBundle">Импорт папки bundle</button>
      <button @click="refresh">Обновить статус</button>
      <p v-if="status && !status.available">Каталог пока не импортирован.</p>
      <label
        >Снимок
        <select v-model="snapshot">
          <option v-for="entry in status?.snapshots ?? []" :key="entry.id" :value="entry.id">
            {{ entry.id }} · {{ entry.patch ?? "patch unknown" }} ·
            {{ entry.verified ? "verified" : "unverified" }}
          </option>
        </select></label
      >
      <button :disabled="!snapshot" @click="activate">Активировать</button>
      <details v-if="status?.activeManifest" open>
        <summary>Источник активного снимка: {{ status.activeSnapshotId }}</summary>
        <p>
          PoE 1 · Patch {{ status.activeManifest.patch ?? "unknown" }} ·
          {{ status.activeManifest.patchVerified ? "verified" : "unverified" }} ·
          {{ status.activeManifest.language }} · League
          {{ status.activeManifest.league ?? "unverified" }}
        </p>
        <p>Получен {{ status.activeManifest.retrievedAt }}</p>
        <div v-for="source in status.activeManifest.sources" :key="source.revision">
          <p>{{ source.repository }} · {{ source.revision }}</p>
          <p>{{ source.url }} · {{ source.attribution }}</p>
          <details>
            <summary>Хеши исходных файлов</summary>
            <pre>{{ JSON.stringify(source.files, null, 2) }}</pre>
          </details>
        </div>
        <p v-for="coverage in status.activeManifest.coverage" :key="coverage">{{ coverage }}</p>
      </details>
      <form @submit.prevent="search()">
        <label
          >Тип
          <select v-model="kind">
            <option value="base">Базы</option>
            <option value="mod">Модификаторы</option>
          </select></label
        >
        <label>Имя / stable ID <input v-model="text" maxlength="200" /></label>
        <label>Класс (точный ID) <input v-model="itemClass" :disabled="kind === 'mod'" /></label>
        <label>Domain <input v-model="domain" /></label>
        <label>Tag <input v-model="tag" /></label>
        <button :disabled="!snapshot">Найти</button>
      </form>
      <section v-if="results">
        <p>
          {{ results.snapshotId }} · Найдено {{ results.total }} · {{ offset + 1 }}–{{
            Math.min(offset + 30, results.total)
          }}
        </p>
        <button :disabled="offset === 0" @click="search(Math.max(0, offset - 30))">Назад</button>
        <button :disabled="offset + 30 >= results.total" @click="search(offset + 30)">
          Следующие 30
        </button>
        <ul>
          <li v-for="row in results.rows" :key="row.id">
            <button @click="inspect(resultKind, row.id)">{{ row.name || row.id }}</button>
            <small>{{ row.id }} · {{ row.domain }} · {{ row.itemClass }}</small>
          </li>
        </ul>
      </section>
      <section v-if="detail">
        <h2>{{ detail.kind }} · {{ detail.record.id }}</h2>
        <p v-if="dimensions">
          Размер в инвентаре:
          <span v-if="dimensions.status === 'known'"
            >{{ dimensions.width }} × {{ dimensions.height }} ячеек</span
          >
          <span v-else>{{ dimensions.status }} — {{ dimensions.reason }}</span>
        </p>
        <p v-for="warning in detail.warnings" :key="warning" role="status">{{ warning }}</p>
        <p v-for="coverage in detail.coverage" :key="coverage">{{ coverage }}</p>
        <template v-if="detail.kind === 'base'">
          <button
            v-for="id in (detail.record.implicitMods as string[]) ?? []"
            :key="id"
            @click="inspect('mod', id)"
          >
            Implicit: {{ id }}
          </button>
        </template>
        <pre>{{ JSON.stringify(detail.record, null, 2) }}</pre>
      </section>
    </fieldset>
  </main>
</template>

<style scoped>
main {
  max-width: 1200px;
  padding: 20px;
  margin: auto;
  color: #eee2ce;
  font: 14px system-ui;
}
fieldset {
  border: 1px solid #766347;
}
button,
input,
select {
  margin: 5px;
  padding: 6px;
}
label {
  display: inline-block;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #211d18;
  padding: 12px;
  max-height: 500px;
  overflow: auto;
}
small {
  overflow-wrap: anywhere;
}
[role="alert"] {
  color: #ff9b91;
}
</style>
