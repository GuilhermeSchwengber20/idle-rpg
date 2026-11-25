<script setup lang="ts">
import type { TileCategory } from '~~/game/types/TileDefinition'
import { TILE_CATEGORIES } from '~~/game/assets/atlasData'
import type { AtlasImporterStore } from '~/composables/useAtlasImporter'

const props = defineProps<{ store: AtlasImporterStore }>()

const LABELS: Record<TileCategory, string> = {
  terrain: 'Terreno',
  decoration: 'Decoração',
  object: 'Objetos'
}

const query = ref('')

const groups = computed(() => {
  const text = query.value.trim().toLowerCase()
  return TILE_CATEGORIES.map((category) => ({
    category,
    label: LABELS[category],
    tiles: props.store.tiles
      .filter((tile) => tile.category === category)
      .filter((tile) => !text || tile.name.toLowerCase().includes(text) || String(tile.id) === text)
  })).filter((group) => group.tiles.length > 0)
})
</script>

<template>
  <section class="list">
    <input v-model="query" class="list__search" type="search" placeholder="Buscar por nome ou id" />

    <p v-if="store.tiles.length === 0" class="list__empty">
      Nenhum tile ainda. Envie um spritesheet ou abra o atlas de exemplo.
    </p>

    <div v-for="group in groups" :key="group.category" class="group">
      <h3>{{ group.label }} <span>{{ group.tiles.length }}</span></h3>
      <div class="group__grid">
        <button
          v-for="tile in group.tiles"
          :key="tile.id"
          type="button"
          class="cell"
          :class="{ 'cell--selected': store.selectedIds.includes(tile.id) }"
          :title="`${tile.name} (id ${tile.id})`"
          @click="store.select(tile.id, $event.shiftKey)"
        >
          <AtlasImporterTileThumb :store="store" :tile="tile" :box="56" />
          <span class="cell__id">{{ tile.id }}</span>
          <span class="cell__name">{{ tile.name }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 12px;
  min-height: 0;
}
.list__search {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  color: inherit;
}
.list__empty {
  color: #94a3b8;
  font-size: 13px;
}
h3 {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}
h3 span {
  margin-left: 4px;
  color: #64748b;
}
.group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 6px;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border: 1px solid #1e293b;
  border-radius: 6px;
  background: #111827;
  color: inherit;
  cursor: pointer;
}
.cell:hover {
  border-color: #475569;
}
.cell--selected {
  border-color: #f59e0b;
  background: #1f2937;
}
.cell__id {
  font-size: 11px;
  color: #f59e0b;
}
.cell__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: #cbd5e1;
}
</style>
