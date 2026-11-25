import type {
  AtlasData,
  AtlasTexture,
  TileCategory,
  TileDefinition,
  TileFrame,
  TilePoint,
  TileSize
} from '../types/TileDefinition'

export const ATLAS_VERSION = 1
export const TILE_CATEGORIES: TileCategory[] = ['terrain', 'decoration', 'object']

/**
 * Âncora sugerida. O usuário pode alterar depois.
 * Terreno: centro do losango do topo (assume proporção 2:1, losango com altura = largura / 2).
 * Decoração e objeto: base, centralizado.
 */
export function defaultOrigin(category: TileCategory, frame: TileFrame): TilePoint {
  if (category === 'terrain') {
    return { x: 0.5, y: round3(frame.width / 4 / frame.height) }
  }
  return { x: 0.5, y: 1 }
}

/** Tamanho com que o frame é desenhado, mantendo a proporção. */
export function scaledSize(frame: TileFrame, scale: number): TileSize {
  return { width: frame.width * scale, height: frame.height * scale }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Devolve a lista de problemas encontrados. Lista vazia significa que o atlas é válido. */
export function validateAtlas(atlas: AtlasData): string[] {
  const issues: string[] = []
  const textures = new Map<string, AtlasTexture>()

  for (const texture of atlas.textures) {
    if (!texture.key) issues.push('Há uma textura sem chave.')
    if (textures.has(texture.key)) issues.push(`Textura duplicada: "${texture.key}".`)
    textures.set(texture.key, texture)
    if (!texture.image) issues.push(`A textura "${texture.key}" está sem caminho de imagem.`)
  }

  const ids = new Set<number>()
  for (const tile of atlas.tiles) {
    const label = `Tile ${tile.id} ("${tile.name}")`
    if (!Number.isInteger(tile.id) || tile.id <= 0) issues.push(`${label}: o id deve ser um inteiro positivo.`)
    if (ids.has(tile.id)) issues.push(`${label}: id duplicado.`)
    ids.add(tile.id)
    if (!tile.name.trim()) issues.push(`${label}: nome vazio.`)
    if (!TILE_CATEGORIES.includes(tile.category)) issues.push(`${label}: categoria inválida.`)

    const texture = textures.get(tile.textureKey)
    if (!texture) {
      issues.push(`${label}: textura "${tile.textureKey}" não existe.`)
    } else {
      const f = tile.frame
      const inside =
        f.x >= 0 && f.y >= 0 && f.x + f.width <= texture.width && f.y + f.height <= texture.height
      if (!inside) issues.push(`${label}: o frame sai dos limites da imagem (${texture.width}x${texture.height}).`)
    }

    const f = tile.frame
    const ints = [f.x, f.y, f.width, f.height].every(Number.isInteger)
    if (!ints || f.width <= 0 || f.height <= 0) issues.push(`${label}: o frame precisa ter valores inteiros e tamanho maior que zero.`)
    if (tile.origin.x < 0 || tile.origin.x > 1 || tile.origin.y < 0 || tile.origin.y > 1) {
      issues.push(`${label}: origin deve estar entre 0 e 1.`)
    }
    if (!(tile.logicalSize.width > 0) || !(tile.logicalSize.height > 0)) {
      issues.push(`${label}: logicalSize deve ser maior que zero.`)
    }
  }
  return issues
}

export function serializeAtlas(atlas: AtlasData): string {
  return JSON.stringify(atlas, null, 2) + '\n'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function num(value: unknown, where: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${where}: esperado um número.`)
  return value
}

function str(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new Error(`${where}: esperado um texto.`)
  return value
}

/** Converte um JSON desconhecido em AtlasData. Lança Error com mensagem em português se a forma estiver errada. */
export function parseAtlas(input: unknown): AtlasData {
  if (!isRecord(input)) throw new Error('O arquivo não é um atlas: esperado um objeto JSON.')
  if (input.version !== ATLAS_VERSION) throw new Error(`Versão de atlas não suportada: ${String(input.version)}.`)
  if (!Array.isArray(input.textures) || !Array.isArray(input.tiles)) {
    throw new Error('O atlas precisa ter as listas "textures" e "tiles".')
  }

  const textures: AtlasTexture[] = input.textures.map((raw, i) => {
    if (!isRecord(raw)) throw new Error(`textures[${i}]: esperado um objeto.`)
    return {
      key: str(raw.key, `textures[${i}].key`),
      image: str(raw.image, `textures[${i}].image`),
      width: num(raw.width, `textures[${i}].width`),
      height: num(raw.height, `textures[${i}].height`)
    }
  })

  const tiles: TileDefinition[] = input.tiles.map((raw, i) => {
    if (!isRecord(raw) || !isRecord(raw.frame) || !isRecord(raw.origin) || !isRecord(raw.logicalSize)) {
      throw new Error(`tiles[${i}]: faltam frame, origin ou logicalSize.`)
    }
    const category = str(raw.category, `tiles[${i}].category`)
    if (!TILE_CATEGORIES.includes(category as TileCategory)) {
      throw new Error(`tiles[${i}].category: valor inválido "${category}".`)
    }
    return {
      id: num(raw.id, `tiles[${i}].id`),
      name: str(raw.name, `tiles[${i}].name`),
      category: category as TileCategory,
      textureKey: str(raw.textureKey, `tiles[${i}].textureKey`),
      frame: {
        x: num(raw.frame.x, `tiles[${i}].frame.x`),
        y: num(raw.frame.y, `tiles[${i}].frame.y`),
        width: num(raw.frame.width, `tiles[${i}].frame.width`),
        height: num(raw.frame.height, `tiles[${i}].frame.height`)
      },
      origin: {
        x: num(raw.origin.x, `tiles[${i}].origin.x`),
        y: num(raw.origin.y, `tiles[${i}].origin.y`)
      },
      logicalSize: {
        width: num(raw.logicalSize.width, `tiles[${i}].logicalSize.width`),
        height: num(raw.logicalSize.height, `tiles[${i}].logicalSize.height`)
      }
    }
  })

  return { version: ATLAS_VERSION, textures, tiles }
}
