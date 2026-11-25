export type TileCategory = 'terrain' | 'decoration' | 'object'

export interface TileFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface TilePoint {
  x: number
  y: number
}

export interface TileSize {
  width: number
  height: number
}

/**
 * Metadados de um tile dentro de um spritesheet.
 * Não contém nada de Phaser nem de Vue: é só dado.
 */
export interface TileDefinition {
  /** Identificador estável. Os mapas guardam esse número, então ele nunca deve ser reaproveitado. */
  id: number
  name: string
  category: TileCategory

  /** Chave da textura (AtlasTexture.key) onde o recorte está. */
  textureKey: string

  /** Recorte real dentro do PNG, em pixels da imagem original. */
  frame: TileFrame

  /**
   * Ponto de ancoragem normalizado (0 a 1) dentro do frame, no estilo `setOrigin` do Phaser.
   * Esse ponto do sprite é colocado no CENTRO do losango da célula da grade.
   * Terreno: centro do losango do topo. Arbusto ou objeto: base do sprite, por exemplo (0.5, 1).
   */
  origin: TilePoint

  /**
   * Tamanho, em pixels de mundo, com que o frame inteiro é desenhado.
   * Mantém a proporção do frame: um sprite de 32x24 desenhado em 2x tem logicalSize 64x48.
   */
  logicalSize: TileSize
}

/** Um PNG que o atlas usa. */
export interface AtlasTexture {
  key: string
  /** URL pública do PNG, por exemplo /assets/tilesets/caboy/RPG-isometric-free.png */
  image: string
  width: number
  height: number
}

/** Conteúdo completo de um arquivo de atlas (.json). */
export interface AtlasData {
  version: 1
  textures: AtlasTexture[]
  tiles: TileDefinition[]
}
