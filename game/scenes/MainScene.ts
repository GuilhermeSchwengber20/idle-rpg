import Phaser from 'phaser' 

const TILE_WIDTH = 64
const TILE_HEIGHT = 32

const MAP_COLUMNS = 15
const MAP_ROWS = 12

type TerrainType = 'grass' | 'dirt' | 'water' | 'stone'

const TERRAIN_COLORS: Record<TerrainType, number> = {
  grass: 0x4f8c52,
  dirt: 0x987044,
  water: 0x397da0,
  stone: 0x777777
}

export class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene')
    }

    create() {
        const graphics = this.add.graphics();

        const originX = 430;
        const originY = 80;

        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLUMNS; col++) {
                const x = originX + (col - row) * (TILE_WIDTH / 2)
                const y = originY + (col + row) * (TILE_HEIGHT / 2)

                const terrain = this.getTerrain(col, row);

                this.drawTile(graphics, x, y, terrain)
            }
        }
    }


    private drawTile(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        terrain: TerrainType
    ) {
        const points = [
            new Phaser.Math.Vector2(x, y),
            new Phaser.Math.Vector2(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2),
            new Phaser.Math.Vector2(x, y + TILE_HEIGHT),
            new Phaser.Math.Vector2(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2)
        ]

        
        graphics.fillStyle(TERRAIN_COLORS[terrain], 1)
        graphics.fillPoints(points, true)

        graphics.lineStyle(1, 0x355e3a, 0.5)
        graphics.strokePoints(points, true)
    }


    private getTerrain(col: number, row: number): TerrainType {
        // Pequeno lago
        const lake =
            ((col - 10) ** 2) / 5 +
            ((row - 3) ** 2) / 3

        if (lake <= 1) {
            return 'water'
        }

        // Caminho de terra
        if (
            (row === 8 && col >= 1 && col <= 9) ||
            (col === 9 && row >= 4 && row <= 8)
        ) {
            return 'dirt'
        }

        // Pequena área de pedras
        if (col >= 3 && col <= 5 && row >= 2 && row <= 3) {
            return 'stone'
        }

        return 'grass'
    }

}