<script setup lang="ts">
import type { TileDefinition } from '~~/game/types/TileDefinition'
import type { AtlasImporterStore } from '~/composables/useAtlasImporter'

const props = defineProps<{ store: AtlasImporterStore }>()

const zoom = ref(4)
const sheet = computed(() => props.store.activeSheet)
const sheetTiles = computed(() =>
  props.store.tiles.filter((tile) => tile.textureKey === props.store.activeSheetKey)
)

function boxStyle(tile: TileDefinition) {
  const { frame } = tile
  return {
    left: `${frame.x * zoom.value}px`,
    top: `${frame.y * zoom.value}px`,
    width: `${frame.width * zoom.value}px`,
    height: `${frame.height * zoom.value}px`
  }
}

function anchorStyle(tile: TileDefinition) {
  return { left: `${tile.origin.x * 100}%`, top: `${tile.origin.y * 100}%` }
}
</script>

<template>
  <section class="viewer">
    <div v-if="store.sheets.length > 0" class="tabs">
      <button
        v-for="item in store.sheets"
        :key="item.key"
        type="button"
        class="tab"
        :class="{ 'tab--active': item.key === store.activeSheetKey }"
        @click="store.activeSheetKey = item.key"
      >
        {{ item.key }}<span v-if="item.missing" class="tab__warn" title="Imagem pendente">!</span>
      </button>
    </div>

    <div v-if="sheet" class="bar">
      <label>
        Zoom
        <select v-model.number="zoom">
          <option v-for="z in [2, 3, 4, 6, 8]" :key="z" :value="z">{{ z }}×</option>
        </select>
      </label>
      <label>
        Alfa mínimo
        <input v-model.number="store.detectOptions.alphaThreshold" type="number" min="1" max="255" />
      </label>
      <label>
        Juntar regiões a até
        <input v-model.number="store.detectOptions.mergeGap" type="number" min="0" max="8" />
        px
      </label>
      <button type="button" :disabled="sheet.missing" @click="store.detectNew(sheet.key)">
        Detectar regiões novas
      </button>
      <button type="button" :disabled="sheet.missing" @click="store.addManualTile(sheet.key)">+ Caixa manual</button>
      <span class="bar__hint">Shift + clique seleciona vários</span>
    </div>

    <p v-if="!sheet" class="empty">
      Arraste PNGs para esta página ou use “Enviar spritesheets”. As caixas aparecem aqui.
    </p>

    <p v-else-if="sheet.missing" class="empty">
      A imagem <strong>{{ sheet.fileName }}</strong> não foi encontrada em <code>{{ sheet.image }}</code>.
      Envie esse arquivo (clique em “Enviar spritesheets” ou arraste-o para cá) para continuar editando.
    </p>

    <div v-else class="scroll">
      <div
        class="stage"
        :style="{ width: `${sheet.width * zoom}px`, height: `${sheet.height * zoom}px` }"
        @click="store.clearSelection()"
      >
        <img
          :src="sheet.src"
          alt=""
          draggable="false"
          :style="{ width: `${sheet.width * zoom}px`, height: `${sheet.height * zoom}px` }"
        />
        <button
          v-for="tile in sheetTiles"
          :key="tile.id"
          type="button"
          class="box"
          :class="{ 'box--selected': store.selectedIds.includes(tile.id) }"
          :style="boxStyle(tile)"
          :title="`${tile.name} (id ${tile.id})`"
          @click.stop="store.select(tile.id, $event.shiftKey)"
        >
          <span class="box__id">{{ tile.id }}</span>
          <i v-if="store.selectedIds.includes(tile.id)" class="box__anchor" :style="anchorStyle(tile)" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid #1e293b;
}
.tab {
  padding: 6px 12px;
  border: 1px solid #1e293b;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #111827;
  color: #94a3b8;
  cursor: pointer;
}
.tab--active {
  background: #1f2937;
  color: #f8fafc;
}
.tab__warn {
  margin-left: 6px;
  color: #f87171;
  font-weight: 700;
}
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #1e293b;
  font-size: 13px;
}
.bar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
}
.bar input[type='number'] {
  width: 56px;
}
.bar__hint {
  margin-left: auto;
  color: #64748b;
  font-size: 12px;
}
.empty {
  margin: 24px;
  color: #94a3b8;
  line-height: 1.5;
}
.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
.stage {
  position: relative;
  background-image: conic-gradient(#2a3342 25%, #222a37 0 50%, #2a3342 0 75%, #222a37 0);
  background-size: 16px 16px;
  outline: 1px solid #334155;
}
.stage img {
  display: block;
  image-rendering: pixelated;
  user-select: none;
}
.box {
  position: absolute;
  padding: 0;
  border: 1px solid rgba(248, 113, 113, 0.9);
  background: transparent;
  cursor: pointer;
}
.box:hover {
  background: rgba(248, 113, 113, 0.15);
}
.box--selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.18);
  z-index: 1;
}
.box__id {
  position: absolute;
  top: 1px;
  left: 2px;
  font-size: 10px;
  line-height: 1;
  color: #fde047;
  text-shadow: 0 0 2px #000;
}
.box__anchor {
  position: absolute;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #ef4444;
  pointer-events: none;
}
</style>
