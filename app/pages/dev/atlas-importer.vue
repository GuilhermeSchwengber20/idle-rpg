<script setup lang="ts">
// Ferramenta de desenvolvimento: não deve existir no build de produção.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Página não encontrada', fatal: true })
}

useHead({ title: 'Atlas Importer' })

const store = useAtlasImporter()
const spritesheetInput = ref<HTMLInputElement | null>(null)
const atlasInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

async function onSpritesheets(event: Event) {
  const input = event.target as HTMLInputElement
  await store.addFiles(Array.from(input.files ?? []))
  input.value = ''
}

async function onDrop(event: DragEvent) {
  dragging.value = false
  await store.addFiles(Array.from(event.dataTransfer?.files ?? []))
}

async function onAtlas(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !confirmReplace()) return
  await store.importAtlasFile(file)
}

async function openSample() {
  if (!confirmReplace()) return
  await store.loadSample()
}

function confirmReplace(): boolean {
  return store.tiles.length === 0 || confirm('Isso substitui o atlas que está aberto. Continuar?')
}

onBeforeUnmount(() => store.dispose())
</script>

<template>
  <div
    class="importer"
    :class="{ 'importer--drag': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <header class="top">
      <h1>Atlas Importer</h1>

      <button type="button" class="primary" @click="spritesheetInput?.click()">Enviar spritesheets…</button>
      <button type="button" @click="atlasInput?.click()">Importar atlas (.json)…</button>
      <button type="button" @click="openSample">Abrir exemplo CABOY</button>
      <button type="button" class="primary" :disabled="store.tiles.length === 0" @click="store.exportAtlas()">
        Exportar atlas
      </button>

      <span class="top__status">
        {{ store.sheets.length }} spritesheet(s) · {{ store.tiles.length }} tile(s)
        <template v-if="store.issues.length > 0"> · <strong class="bad">{{ store.issues.length }} problema(s)</strong></template>
      </span>

      <input ref="spritesheetInput" type="file" accept="image/png,image/*" multiple hidden @change="onSpritesheets" />
      <input ref="atlasInput" type="file" accept="application/json,.json" hidden @change="onAtlas" />
    </header>

    <p v-if="store.notice" class="notice" :class="`notice--${store.notice.kind}`" role="status">
      {{ store.notice.text }}
      <button type="button" aria-label="Fechar aviso" @click="store.notice = null">×</button>
    </p>

    <details v-if="store.issues.length > 0" class="issues">
      <summary>{{ store.issues.length }} problema(s) no atlas</summary>
      <ul>
        <li v-for="issue in store.issues" :key="issue">{{ issue }}</li>
      </ul>
    </details>

    <main class="layout">
      <AtlasImporterTileList :store="store" class="layout__list" />
      <AtlasImporterSheetViewer :store="store" class="layout__viewer" />
      <AtlasImporterInspector :store="store" class="layout__inspector" />
    </main>
  </div>
</template>

<style scoped>
.importer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0b1220;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}
.importer--drag {
  outline: 3px dashed #f59e0b;
  outline-offset: -6px;
}
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
}
.top h1 {
  margin: 0 12px 0 0;
  font-size: 16px;
}
.top__status {
  margin-left: auto;
  color: #94a3b8;
  font-size: 13px;
}
.bad {
  color: #f87171;
}
.notice {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 8px 12px;
  font-size: 13px;
}
.notice--info {
  background: #12301f;
  color: #86efac;
}
.notice--error {
  background: #3b1519;
  color: #fca5a5;
}
.notice button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.issues {
  padding: 6px 12px;
  background: #1c1410;
  color: #fdba74;
  font-size: 12px;
}
.issues ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 300px;
  min-height: 0;
}
.layout__list {
  border-right: 1px solid #1e293b;
}
.layout__inspector {
  border-left: 1px solid #1e293b;
}
.primary {
  border-color: #b45309 !important;
  background: #78350f !important;
}
</style>

<!-- Sem "scoped" de propósito: estiliza os botões e campos dos componentes filhos, limitado a .importer. -->
<style>
.importer button {
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: inherit;
  cursor: pointer;
}
.importer button:hover:not(:disabled) {
  background: #273449;
}
.importer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.importer input:not([type='file']),
.importer select {
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: inherit;
}
</style>
