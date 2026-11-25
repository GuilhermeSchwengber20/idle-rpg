import type { TileFrame } from '../types/TileDefinition'

/** Pixels RGBA, no mesmo formato de ImageData. Não depende de DOM, então roda em Node também. */
export interface PixelBuffer {
  width: number
  height: number
  data: ArrayLike<number>
}

export interface DetectOptions {
  /** Pixels com alfa >= esse valor contam como opacos. Padrão: 1 (qualquer pixel visível). */
  alphaThreshold?: number
  /**
   * Junta regiões cujas caixas estão separadas por no máximo N pixels vazios.
   * Padrão: 0 (não junta nada). Use 1 para colar uma sombra solta ao seu sprite.
   */
  mergeGap?: number
  /** Ignora regiões com menos pixels opacos que isso (poeira). Padrão: 1. */
  minPixels?: number
}

interface Box {
  x0: number
  y0: number
  x1: number // inclusivo
  y1: number // inclusivo
  pixels: number
}

function alphaAt(img: PixelBuffer, x: number, y: number): number {
  return img.data[(y * img.width + x) * 4 + 3] ?? 0
}

/** Componentes conectados (8 vizinhos) sobre o canal alfa. */
function findBoxes(img: PixelBuffer, threshold: number): Box[] {
  const { width, height } = img
  const seen = new Uint8Array(width * height)
  const boxes: Box[] = []

  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const start = sy * width + sx
      if (seen[start] || alphaAt(img, sx, sy) < threshold) continue

      const box: Box = { x0: sx, y0: sy, x1: sx, y1: sy, pixels: 0 }
      const stack = [start]
      seen[start] = 1

      while (stack.length > 0) {
        const index = stack.pop() as number
        const x = index % width
        const y = (index - x) / width
        box.pixels++
        if (x < box.x0) box.x0 = x
        if (x > box.x1) box.x1 = x
        if (y < box.y0) box.y0 = y
        if (y > box.y1) box.y1 = y

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const next = ny * width + nx
            if (seen[next] || alphaAt(img, nx, ny) < threshold) continue
            seen[next] = 1
            stack.push(next)
          }
        }
      }
      boxes.push(box)
    }
  }
  return boxes
}

/** Pixels vazios entre duas caixas em um eixo (0 se elas se sobrepõem ou se tocam). */
function gap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  if (bMin > aMax) return bMin - aMax - 1
  if (aMin > bMax) return aMin - bMax - 1
  return 0
}

function mergeNearby(boxes: Box[], mergeGap: number): Box[] {
  const result = boxes.map((b) => ({ ...b }))
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < result.length && !changed; i++) {
      for (let j = i + 1; j < result.length && !changed; j++) {
        const a = result[i] as Box
        const b = result[j] as Box
        const near =
          gap(a.x0, a.x1, b.x0, b.x1) <= mergeGap && gap(a.y0, a.y1, b.y0, b.y1) <= mergeGap
        if (!near) continue
        a.x0 = Math.min(a.x0, b.x0)
        a.y0 = Math.min(a.y0, b.y0)
        a.x1 = Math.max(a.x1, b.x1)
        a.y1 = Math.max(a.y1, b.y1)
        a.pixels += b.pixels
        result.splice(j, 1)
        changed = true
      }
    }
  }
  return result
}

/**
 * Ordem de leitura: agrupa em linhas pela sobreposição vertical e ordena cada linha da esquerda
 * para a direita. Assim, tiles de alturas diferentes na mesma linha não se embaralham.
 */
function sortReadingOrder(boxes: Box[]): Box[] {
  const byTop = [...boxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
  const rows: Box[][] = []
  let rowBottom = -1
  for (const box of byTop) {
    const last = rows[rows.length - 1]
    if (!last || box.y0 > rowBottom) {
      rows.push([box])
      rowBottom = box.y1
    } else {
      last.push(box)
      rowBottom = Math.max(rowBottom, box.y1)
    }
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x0 - b.x0))
}

/** Sugere um recorte por sprite. É só uma sugestão: o usuário revisa e ajusta. */
export function detectRegions(img: PixelBuffer, options: DetectOptions = {}): TileFrame[] {
  const threshold = options.alphaThreshold ?? 1
  const mergeGap = options.mergeGap ?? 0
  const minPixels = options.minPixels ?? 1

  let boxes = findBoxes(img, threshold).filter((b) => b.pixels >= minPixels)
  if (mergeGap > 0) boxes = mergeNearby(boxes, mergeGap)

  return sortReadingOrder(boxes).map((b) => ({
    x: b.x0,
    y: b.y0,
    width: b.x1 - b.x0 + 1,
    height: b.y1 - b.y0 + 1
  }))
}

/** Encolhe um recorte até o menor retângulo que contém todos os pixels visíveis dentro dele. */
export function tightBounds(
  img: PixelBuffer,
  rect: TileFrame,
  alphaThreshold = 1
): TileFrame | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -1
  let y1 = -1

  const maxY = Math.min(img.height, rect.y + rect.height)
  const maxX = Math.min(img.width, rect.x + rect.width)
  for (let y = Math.max(0, rect.y); y < maxY; y++) {
    for (let x = Math.max(0, rect.x); x < maxX; x++) {
      if (alphaAt(img, x, y) < alphaThreshold) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}
