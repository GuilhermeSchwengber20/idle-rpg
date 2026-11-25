<script setup lang="ts">
import { TILE_CATEGORIES } from '~~/game/assets/atlasData'
import type { AtlasImporterStore } from '~/composables/useAtlasImporter'

const props = defineProps<{ store: AtlasImporterStore }>()

const CATEGORY_LABELS = { terrain: 'Terreno', decoration: 'Decoração', object: 'Objeto' } as const

const sheet = computed(() => props.store.activeSheet)
const selected = computed(() => props.store.selectedTiles)
const tile = computed(() => (selected.value.length === 1 ? (selected.value[0] ?? null) : null))

function removeSheet() {
  if (!sheet.value) return
  if (confirm(`Remover a spritesheet "${sheet.value.key}" e todos os tiles dela?`)) {
    props.store.removeSheet(sheet.value.key)
  }
}

function removeSelected() {
  if (confirm(`Excluir ${selected.value.length} tile(s)? Os ids deles não serão reaproveitados.`)) {
    props.store.removeSelected()
  }
}
</script>

<template>
  <aside class="inspector">
    <section v-if="sheet" class="block">
      <h3>Spritesheet “{{ sheet.key }}”</h3>
      <label>
        Caminho público (vai no JSON)
        <input v-model="sheet.image" type="text" />
      </label>
      <label>
        Escala de desenho
        <input v-model.number="sheet.scale" type="number" min="0.25" step="0.25" />
      </label>
      <small>Tamanho do PNG: {{ sheet.width }}×{{ sheet.height }} px</small>
      <div class="row">
        <button type="button" @click="store.applyScale(sheet.key)">Aplicar escala a todos</button>
        <button type="button" class="danger" @click="removeSheet">Remover</button>
      </div>
    </section>

    <section class="block">
      <h3>Tile</h3>

      <p v-if="selected.length === 0" class="hint">Selecione uma caixa no viewer ou um tile na lista.</p>

      <template v-else-if="selected.length > 1">
        <p class="hint">{{ selected.length }} tiles selecionados.</p>
        <div class="row">
          <button type="button" @click="store.mergeSelected()">Juntar em um só</button>
          <button type="button" class="danger" @click="removeSelected">Excluir</button>
        </div>
      </template>

      <template v-else-if="tile">
        <label>
          Id
          <input :value="tile.id" type="text" disabled />
        </label>
        <label>
          Nome
          <input v-model="tile.name" type="text" />
        </label>
        <label>
          Categoria
          <select v-model="tile.category">
            <option v-for="category in TILE_CATEGORIES" :key="category" :value="category">
              {{ CATEGORY_LABELS[category] }}
            </option>
          </select>
        </label>

        <fieldset>
          <legend>Frame (pixels do PNG)</legend>
          <div class="grid4">
            <label>x<input v-model.number="tile.frame.x" type="number" min="0" /></label>
            <label>y<input v-model.number="tile.frame.y" type="number" min="0" /></label>
            <label>largura<input v-model.number="tile.frame.width" type="number" min="1" /></label>
            <label>altura<input v-model.number="tile.frame.height" type="number" min="1" /></label>
          </div>
          <button type="button" @click="store.tightenSelected()">Ajustar ao conteúdo</button>
        </fieldset>

        <fieldset>
          <legend>Origin (0 a 1)</legend>
          <div class="grid2">
            <label>x<input v-model.number="tile.origin.x" type="number" min="0" max="1" step="0.01" /></label>
            <label>y<input v-model.number="tile.origin.y" type="number" min="0" max="1" step="0.01" /></label>
          </div>
          <button type="button" @click="store.resetOrigin(tile)">Sugerir pela categoria</button>
        </fieldset>

        <fieldset>
          <legend>Tamanho desenhado (logicalSize)</legend>
          <div class="grid2">
            <label>largura<input v-model.number="tile.logicalSize.width" type="number" min="1" /></label>
            <label>altura<input v-model.number="tile.logicalSize.height" type="number" min="1" /></label>
          </div>
          <button type="button" @click="store.applyScale(tile.textureKey, tile)">Frame × escala</button>
        </fieldset>

        <button type="button" class="danger" @click="removeSelected">Excluir tile</button>
      </template>
    </section>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 12px;
  min-height: 0;
  font-size: 13px;
}
.block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
h3 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}
label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #cbd5e1;
}
input,
select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 5px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: inherit;
}
input:disabled {
  opacity: 0.6;
}
fieldset {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0; /* fieldset tem min-width: min-content por padrão e estoura o painel */
  margin: 0;
  padding: 8px;
  border: 1px solid #1e293b;
  border-radius: 6px;
}
legend {
  padding: 0 4px;
  color: #94a3b8;
}
.grid2,
.grid4 {
  display: grid;
  gap: 6px;
}
.grid2,
.grid4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.row {
  display: flex;
  gap: 8px;
}
.hint {
  margin: 0;
  color: #94a3b8;
  line-height: 1.4;
}
small {
  color: #64748b;
}
.danger {
  border-color: #7f1d1d;
  color: #fca5a5;
}
</style>
