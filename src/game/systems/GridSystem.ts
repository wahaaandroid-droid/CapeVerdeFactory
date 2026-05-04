import Phaser from 'phaser';
import { Building } from '../entities/Building';
import {
  Cell,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  TILE_SIZE,
  Terrain,
  Tile,
  cellKey,
  manhattan,
} from '../types';

export class GridSystem {
  readonly tiles: Tile[][] = [];
  private readonly buildings = new Map<string, Building>();
  private tileSprites: Phaser.GameObjects.Sprite[] = [];
  private readonly spawnCells: Cell[] = [
    { x: 19, y: 3 },
    { x: 19, y: 7 },
    { x: 19, y: 12 },
    { x: 19, y: 17 },
  ];

  constructor() {
    this.generateMap();
  }

  render(scene: Phaser.Scene): void {
    this.tileSprites.forEach((sprite) => sprite.destroy());
    this.tileSprites = [];

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const terrain = this.tiles[y][x].terrain;
        const sprite = scene.add
          .sprite(
            MAP_ORIGIN_X + x * TILE_SIZE,
            MAP_ORIGIN_Y + y * TILE_SIZE,
            `tile-${terrain}`,
          )
          .setOrigin(0)
          .setDepth(1);
        this.tileSprites.push(sprite);
      }
    }
  }

  getTerrain(cell: Cell): Terrain {
    return this.tiles[cell.y]?.[cell.x]?.terrain ?? 'lava';
  }

  inBounds(cell: Cell): boolean {
    return (
      cell.x >= 0 &&
      cell.x < GRID_WIDTH &&
      cell.y >= 0 &&
      cell.y < GRID_HEIGHT
    );
  }

  isBuildable(cell: Cell): boolean {
    if (!this.inBounds(cell)) {
      return false;
    }

    const terrain = this.getTerrain(cell);
    return terrain !== 'lava' && terrain !== 'ocean';
  }

  isEnemyPassable(cell: Cell): boolean {
    if (!this.inBounds(cell)) {
      return false;
    }

    return this.getTerrain(cell) !== 'lava';
  }

  getBuilding(cell: Cell): Building | undefined {
    return this.buildings.get(cellKey(cell));
  }

  setBuilding(cell: Cell, building: Building): void {
    this.buildings.set(cellKey(cell), building);
  }

  clearBuilding(cell: Cell): void {
    this.buildings.delete(cellKey(cell));
  }

  allBuildings(): Building[] {
    return [...this.buildings.values()];
  }

  cellToWorld(cell: Cell): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      MAP_ORIGIN_X + cell.x * TILE_SIZE + TILE_SIZE / 2,
      MAP_ORIGIN_Y + cell.y * TILE_SIZE + TILE_SIZE / 2,
    );
  }

  worldToCell(x: number, y: number): Cell | null {
    const gridX = Math.floor((x - MAP_ORIGIN_X) / TILE_SIZE);
    const gridY = Math.floor((y - MAP_ORIGIN_Y) / TILE_SIZE);
    const cell = { x: gridX, y: gridY };
    return this.inBounds(cell) ? cell : null;
  }

  neighbors(cell: Cell): Cell[] {
    return [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ].filter((candidate) => this.inBounds(candidate));
  }

  bestEnemyStep(from: Cell, target: Cell): Cell | null {
    const candidates = this.neighbors(from)
      .filter((cell) => this.isEnemyPassable(cell))
      .sort((a, b) => {
        const distance = manhattan(a, target) - manhattan(b, target);
        if (distance !== 0) {
          return distance;
        }

        return a.y - b.y || a.x - b.x;
      });

    return candidates[0] ?? null;
  }

  randomSpawnCell(wave: number): Cell {
    const index = (wave + Phaser.Math.Between(0, this.spawnCells.length - 1)) %
      this.spawnCells.length;
    return { ...this.spawnCells[index] };
  }

  private generateMap(): void {
    const lava = new Set([
      '2,15',
      '3,15',
      '3,16',
      '4,16',
      '7,3',
      '8,3',
      '8,4',
      '15,2',
      '16,2',
      '16,3',
      '15,15',
      '16,15',
      '16,16',
      '12,17',
      '13,17',
    ]);
    const resource = new Set(['4,8', '2,5', '4,14', '6,16', '15,6']);
    const geothermal = new Set(['11,11', '13,5', '7,12', '5,3']);

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const key = `${x},${y}`;
        let terrain: Terrain = 'ground';

        if (x >= 18) {
          terrain = 'ocean';
        } else if (lava.has(key)) {
          terrain = 'lava';
        } else if (resource.has(key)) {
          terrain = 'resource';
        } else if (geothermal.has(key)) {
          terrain = 'geothermal';
        }

        row.push({ terrain });
      }
      this.tiles.push(row);
    }
  }
}
