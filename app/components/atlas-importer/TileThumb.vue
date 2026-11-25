<script setup lang="ts">
import type { TileDefinition } from '~~/game/types/TileDefinition'
import type { AtlasImporterStore } from '~/composables/useAtlasImporter'

const props = withDefaults(
  defineProps<{
    store: AtlasImporterStore
    tile: TileDefinition
    /** Lado da área em que a miniatura precisa caber, em pixels. */
    box?: number
  }>(),
  { box: 56 }
)

const canvas = ref<HTMLCanvasElement | null>(null)

function draw() {
  const element = canvas.value
  if (!element) return

  const { frame } = props.tile
  void props.store.imageVersion // redesenha quando uma imagem termina de carregar
  const image = props.store.getImage(props.tile.textureKey)

  // Só múltiplos inteiros, para o pixel art continuar nítido.
  const scale = Math.max(1, Math.floor(Math.min(props.box / frame.width, props.box / frame.height)))
  element.width = Math.max(1, frame.width * scale)
  element.height = Math.max(1, frame.height * scale)

  const context = element.getContext('2d')
  if (!context) return
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, element.width, element.height)
  if (image) {
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, element.width, element.height)
  }
}

onMounted(() => {
  watchEffect(draw)
})
</script>

<template>
  <div class="thumb" :style="{ width: `${box}px`, height: `${box}px` }">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.thumb {
  display: grid;
  place-items: center;
  background-image: conic-gradient(#2a3342 25%, #222a37 0 50%, #2a3342 0 75%, #222a37 0);
  background-size: 12px 12px;
  border-radius: 4px;
}
canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
