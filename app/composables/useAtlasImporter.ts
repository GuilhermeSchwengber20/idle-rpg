import type { AtlasData, TileCategory, TileDefinition, TileFrame } from '~~/game/types/TileDefinition'
import { detectRegions, tightBounds, type PixelBuffer } from '~~/game/assets/detectRegions'
import {
  ATLAS_VERSION,
  defaultOrigin,
  parseAtlas,
  scaledSize,
  serializeAtlas,
  validateAtlas
} from '~~/game/assets/atlasData'

export interface SheetState {
  /** Chave da textura. É a mesma que os tiles guardam em textureKey. */
  key: string
  fileName: string
  /** Caminho público que vai para o JSON exportado (onde o PNG ficará em /public). */
  image: string
  /** URL usada para exibir agora: um blob: do upload ou o próprio caminho público. */
  src: string
  width: number
  height: number
  /** Quantas vezes o sprite é desenhado maior que o PNG (logicalSize = frame × escala). */
  scale: number
  /** true quando o atlas foi importado, mas o PNG ainda não foi encontrado. */
  missing: boolean
}

export interface Notice {
  kind: 'info' | 'error'
  text: string
}

function baseName(path: string): string {
  return path.split('/').pop() ?? path
}

function slug(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'sheet'
}

function overlaps(a: TileFrame, b: TileFrame): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function unionFrame(frames: TileFrame[]): TileFrame {
  const x0 = Math.min(...frames.map((f) => f.x))
  const y0 = Math.min(...frames.map((f) => f.y))
  const x1 = Math.max(...frames.map((f) => f.x + f.width))
  const y1 = Math.max(...frames.map((f) => f.y + f.height))
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Não foi possível carregar a imagem: ${src}`))
    image.src = src
  })
}

/**
 * Estado do importador de atlas. Só mexe com dados e canvas 2D, sem Phaser.
 * Retorna um objeto reativo: nos templates, use `store.tiles` direto, sem `.value`.
 */
export function useAtlasImporter() {
  const sheets = ref<SheetState[]>([])
  const tiles = ref<TileDefinition[]>([])
  const activeSheetKey = ref<string | null>(null)
  const selectedIds = ref<number[]>([])
  const detectOptions = reactive({ alphaThreshold: 1, mergeGap: 1 })
  const notice = ref<Notice | null>(null)
  /** Sobe a cada imagem carregada, para os canvas das miniaturas redesenharem. */
  const imageVersion = ref(0)

  // Imagens e pixels ficam fora da reatividade: são pesados e não mudam por edição.
  const images = new Map<string, HTMLImageElement>()
  const pixels = new Map<string, PixelBuffer>()
  let nextId = 1

  const activeSheet = computed(() => sheets.value.find((s) => s.key === activeSheetKey.value) ?? null)
  const selectedTiles = computed(() => tiles.value.filter((t) => selectedIds.value.includes(t.id)))
  const currentAtlas = computed<AtlasData>(() => ({
    version: ATLAS_VERSION,
    textures: sheets.value.map((s) => ({ key: s.key, image: s.image, width: s.width, height: s.height })),
    tiles: [...tiles.value].sort((a, b) => a.id - b.id)
  }))
  const issues = computed(() => validateAtlas(currentAtlas.value))

  function notify(text: string, kind: Notice['kind'] = 'info') {
    notice.value = { kind, text }
  }

  function getImage(key: string): HTMLImageElement | null {
    return images.get(key) ?? null
  }

  function getPixels(key: string): PixelBuffer | null {
    const cached = pixels.get(key)
    if (cached) return cached
    const image = images.get(key)
    if (!image) return null
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height)
    pixels.set(key, data)
    return data
  }

  function setImage(sheet: SheetState, image: HTMLImageElement) {
    images.set(sheet.key, image)
    pixels.delete(sheet.key)
    imageVersion.value++
  }

  function uniqueKey(base: string): string {
    let key = base
    let n = 2
    while (sheets.value.some((s) => s.key === key)) key = `${base}-${n++}`
    return key
  }

  function sheetScale(key: string): number {
    return sheets.value.find((s) => s.key === key)?.scale ?? 1
  }

  // ---------- spritesheets ----------

  async function addFiles(files: File[]) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        notify(`${file.name}: não é uma imagem.`, 'error')
        continue
      }
      const src = URL.createObjectURL(file)
      let image: HTMLImageElement
      try {
        image = await loadImage(src)
      } catch {
        URL.revokeObjectURL(src)
        notify(`${file.name}: não foi possível ler a imagem.`, 'error')
        continue
      }

      // Atlas importado esperando exatamente esse PNG: só encaixa a imagem.
      const pending = sheets.value.find((s) => s.missing && baseName(s.image) === file.name)
      if (pending) {
        pending.src = src
        pending.missing = false
        setImage(pending, image)
        activeSheetKey.value = pending.key
        if (pending.width !== image.naturalWidth || pending.height !== image.naturalHeight) {
          notify(`${file.name}: o tamanho (${image.naturalWidth}×${image.naturalHeight}) é diferente do que o atlas registrou.`, 'error')
          pending.width = image.naturalWidth
          pending.height = image.naturalHeight
        }
        continue
      }

      const key = uniqueKey(slug(file.name))
      const sheet: SheetState = {
        key,
        fileName: file.name,
        image: `/assets/tilesets/${file.name}`,
        src,
        width: image.naturalWidth,
        height: image.naturalHeight,
        scale: 1,
        missing: false
      }
      sheets.value.push(sheet)
      setImage(sheet, image)
      activeSheetKey.value = key
      const added = detectNew(key)
      notify(`${file.name}: ${added} região(ões) detectada(s). Revise as caixas antes de exportar.`)
    }
  }

  function removeSheet(key: string) {
    const sheet = sheets.value.find((s) => s.key === key)
    if (sheet?.src.startsWith('blob:')) URL.revokeObjectURL(sheet.src)
    images.delete(key)
    pixels.delete(key)
    tiles.value = tiles.value.filter((t) => t.textureKey !== key)
    sheets.value = sheets.value.filter((s) => s.key !== key)
    selectedIds.value = selectedIds.value.filter((id) => tiles.value.some((t) => t.id === id))
    if (activeSheetKey.value === key) activeSheetKey.value = sheets.value[0]?.key ?? null
  }

  // ---------- tiles ----------

  function createTile(sheetKey: string, frame: TileFrame, category: TileCategory = 'terrain'): TileDefinition {
    const count = tiles.value.filter((t) => t.textureKey === sheetKey).length + 1
    const tile: TileDefinition = {
      id: nextId++,
      name: `${sheetKey}_${String(count).padStart(2, '0')}`,
      category,
      textureKey: sheetKey,
      frame: { ...frame },
      origin: defaultOrigin(category, frame),
      logicalSize: scaledSize(frame, sheetScale(sheetKey))
    }
    tiles.value.push(tile)
    return tile
  }

  /** Detecta regiões e cria tiles só onde ainda não há um. Os tiles existentes e seus ids ficam intactos. */
  function detectNew(sheetKey: string): number {
    const buffer = getPixels(sheetKey)
    if (!buffer) {
      notify('A imagem desta spritesheet ainda não foi carregada.', 'error')
      return 0
    }
    const regions = detectRegions(buffer, {
      alphaThreshold: detectOptions.alphaThreshold,
      mergeGap: detectOptions.mergeGap
    })
    const widest = Math.max(1, ...regions.map((r) => r.width))
    const existing = tiles.value.filter((t) => t.textureKey === sheetKey)
    let added = 0
    for (const frame of regions) {
      if (existing.some((t) => overlaps(t.frame, frame))) continue
      // Chute inicial: sprites bem mais estreitos que o maior da imagem costumam ser decoração.
      createTile(sheetKey, frame, frame.width >= widest * 0.75 ? 'terrain' : 'decoration')
      added++
    }
    return added
  }

  function addManualTile(sheetKey: string) {
    const sheet = sheets.value.find((s) => s.key === sheetKey)
    if (!sheet) return
    const tile = createTile(sheetKey, { x: 0, y: 0, width: Math.min(16, sheet.width), height: Math.min(16, sheet.height) })
    selectedIds.value = [tile.id]
  }

  function select(id: number, additive = false) {
    if (additive) {
      selectedIds.value = selectedIds.value.includes(id)
        ? selectedIds.value.filter((x) => x !== id)
        : [...selectedIds.value, id]
      return
    }
    selectedIds.value = [id]
    const tile = tiles.value.find((t) => t.id === id)
    if (tile) activeSheetKey.value = tile.textureKey
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function removeSelected() {
    const ids = new Set(selectedIds.value)
    tiles.value = tiles.value.filter((t) => !ids.has(t.id))
    selectedIds.value = []
  }

  function mergeSelected() {
    const selected = [...selectedTiles.value].sort((a, b) => a.id - b.id)
    const keep = selected[0]
    if (!keep || selected.length < 2) return
    if (selected.some((t) => t.textureKey !== keep.textureKey)) {
      notify('Só dá para juntar tiles da mesma imagem.', 'error')
      return
    }
    const frame = unionFrame(selected.map((t) => t.frame))
    const removed = new Set(selected.slice(1).map((t) => t.id))
    keep.frame = frame
    keep.origin = defaultOrigin(keep.category, frame)
    keep.logicalSize = scaledSize(frame, sheetScale(keep.textureKey))
    tiles.value = tiles.value.filter((t) => !removed.has(t.id))
    selectedIds.value = [keep.id]
  }

  /** Encolhe a caixa até o conteúdo visível. */
  function tightenSelected() {
    for (const tile of selectedTiles.value) {
      const buffer = getPixels(tile.textureKey)
      if (!buffer) continue
      const frame = tightBounds(buffer, tile.frame, detectOptions.alphaThreshold)
      if (!frame) {
        notify(`${tile.name}: não há pixels visíveis dentro da caixa.`, 'error')
        continue
      }
      tile.frame = frame
      tile.logicalSize = scaledSize(frame, sheetScale(tile.textureKey))
    }
  }

  function resetOrigin(tile: TileDefinition) {
    tile.origin = defaultOrigin(tile.category, tile.frame)
  }

  /** logicalSize = frame × escala, para um tile ou para todos da spritesheet. */
  function applyScale(sheetKey: string, only?: TileDefinition) {
    const scale = sheetScale(sheetKey)
    for (const tile of tiles.value) {
      if (tile.textureKey !== sheetKey) continue
      if (only && tile.id !== only.id) continue
      tile.logicalSize = scaledSize(tile.frame, scale)
    }
  }

  // ---------- atlas (JSON) ----------

  function inferScale(atlas: AtlasData, key: string): number {
    const tile = atlas.tiles.find((t) => t.textureKey === key)
    if (!tile) return 1
    return Math.round((tile.logicalSize.width / tile.frame.width) * 1000) / 1000
  }

  async function applyAtlas(atlas: AtlasData) {
    dispose()
    sheets.value = []
    tiles.value = []
    images.clear()
    pixels.clear()

    for (const texture of atlas.textures) {
      const sheet: SheetState = {
        key: texture.key,
        fileName: baseName(texture.image),
        image: texture.image,
        src: texture.image,
        width: texture.width,
        height: texture.height,
        scale: inferScale(atlas, texture.key),
        missing: false
      }
      try {
        setImage(sheet, await loadImage(texture.image))
      } catch {
        sheet.missing = true
        sheet.src = ''
      }
      sheets.value.push(sheet)
    }

    tiles.value = atlas.tiles
    nextId = Math.max(0, ...atlas.tiles.map((t) => t.id)) + 1
    activeSheetKey.value = sheets.value[0]?.key ?? null
    selectedIds.value = []

    const missing = sheets.value.filter((s) => s.missing)
    if (missing.length > 0) {
      notify(`Atlas carregado. Envie as imagens que faltam: ${missing.map((s) => s.fileName).join(', ')}.`, 'error')
    } else {
      notify(`Atlas carregado: ${atlas.tiles.length} tile(s).`)
    }
  }

  async function importAtlasText(text: string) {
    try {
      await applyAtlas(parseAtlas(JSON.parse(text)))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível ler o atlas.', 'error')
    }
  }

  async function importAtlasFile(file: File) {
    await importAtlasText(await file.text())
  }

  async function loadSample() {
    try {
      const response = await fetch('/assets/atlases/caboy.json')
      if (!response.ok) throw new Error(`Atlas de exemplo não encontrado (${response.status}).`)
      await importAtlasText(await response.text())
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Falha ao abrir o atlas de exemplo.', 'error')
    }
  }

  function exportAtlas() {
    if (issues.value.length > 0) {
      notify(`Corrija ${issues.value.length} problema(s) antes de exportar.`, 'error')
      return
    }
    const fileName = sheets.value.length === 1 ? `${sheets.value[0]?.key}.json` : 'atlas.json'
    const blob = new Blob([serializeAtlas(currentAtlas.value)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    notify(`${fileName} exportado. Coloque-o em public/assets/atlases/ e os PNGs nos caminhos indicados.`)
  }

  function dispose() {
    for (const sheet of sheets.value) {
      if (sheet.src.startsWith('blob:')) URL.revokeObjectURL(sheet.src)
    }
  }

  return reactive({
    sheets,
    tiles,
    activeSheetKey,
    activeSheet,
    selectedIds,
    selectedTiles,
    detectOptions,
    notice,
    imageVersion,
    issues,
    getImage,
    addFiles,
    removeSheet,
    detectNew,
    addManualTile,
    select,
    clearSelection,
    removeSelected,
    mergeSelected,
    tightenSelected,
    resetOrigin,
    applyScale,
    importAtlasFile,
    loadSample,
    exportAtlas,
    dispose
  })
}

export type AtlasImporterStore = ReturnType<typeof useAtlasImporter>
