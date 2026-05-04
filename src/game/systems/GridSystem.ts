import Phaser from 'phaser';
import { Building } from '../entities/Building';
import {
  Cell,
  GRID_HEIGHT,
  GRID_WIDTH,
  LEFT_EXPANSION_COLUMNS,
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
    { x: GRID_WIDTH - 1, y: 3 },
    { x: GRID_WIDTH - 1, y: 7 },
    { x: GRID_WIDTH - 1, y: 12 },
    { x: GRID_WIDTH - 1, y: 17 },
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
        this.registerWorld(scene, sprite);
        this.tileSprites.push(sprite);
      }
    }
  }

  updateCulling(camera: Phaser.Cameras.Scene2D.Camera): void {
    const pad = TILE_SIZE * 2;
    const viewWidth = camera.width / camera.zoom;
    const viewHeight = camera.height / camera.zoom;
    const viewLeft = camera.scrollX + camera.width * 0.5 - viewWidth * 0.5;
    const viewTop = camera.scrollY + camera.height * 0.5 - viewHeight * 0.5;
    const viewRight = viewLeft + viewWidth;
    const viewBottom = viewTop + viewHeight;

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const sprite = this.tileSprites[y * GRID_WIDTH + x];
        const worldX = MAP_ORIGIN_X + x * TILE_SIZE;
        const worldY = MAP_ORIGIN_Y + y * TILE_SIZE;
        sprite.setVisible(
          worldX + TILE_SIZE >= viewLeft - pad &&
            worldX <= viewRight + pad &&
            worldY + TILE_SIZE >= viewTop - pad &&
            worldY <= viewBottom + pad,
        );
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
    const old = (x: number, y: number) => `${x + LEFT_EXPANSION_COLUMNS},${y}`;
    const lava = new Set([
      '1,16',
      '2,16',
      '3,17',
      '5,2',
      '10,3',
      '11,3',
      '12,4',
      '18,15',
      '19,15',
      '20,16',
      '27,6',
      '28,6',
      '28,7',
      old(2, 15),
      old(3, 15),
      old(3, 16),
      old(4, 16),
      old(7, 3),
      old(8, 3),
      old(8, 4),
      old(15, 2),
      old(16, 2),
      old(16, 3),
      old(15, 15),
      old(16, 15),
      old(16, 16),
      old(12, 17),
      old(13, 17),
    ]);
    const resource = new Set([
      '2,9',
      '5,4',
      '11,12',
      '18,7',
      '25,15',
      '31,5',
      old(4, 8),
      old(2, 5),
      old(4, 14),
      old(6, 16),
      old(15, 6),
    ]);
    const geothermal = new Set([
      '8,6',
      '15,17',
      '24,3',
      '30,12',
      old(11, 11),
      old(13, 5),
      old(7, 12),
      old(5, 3),
    ]);

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const key = `${x},${y}`;
        let terrain: Terrain = 'ground';

        if (x >= GRID_WIDTH - 2) {
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

  private registerWorld(
    scene: Phaser.Scene,
    object: Phaser.GameObjects.GameObject,
  ): void {
    const maybeScene = scene as Phaser.Scene & {
      registerWorldObject?: (object: Phaser.GameObjects.GameObject) => void;
    };
    maybeScene.registerWorldObject?.(object);
  }
}
