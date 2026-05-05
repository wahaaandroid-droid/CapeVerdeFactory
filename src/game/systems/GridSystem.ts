import Phaser from 'phaser';
import { Building } from '../entities/Building';
import {
  Cell,
  GRID_HEIGHT,
  GRID_WIDTH,
  LEFT_EXPANSION_COLUMNS,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  ResourceKind,
  TILE_SIZE,
  Terrain,
  Tile,
  cellKey,
  manhattan,
} from '../types';

interface ResourcePlacement {
  cell: Cell;
  resource: ResourceKind;
}

const shifted = (x: number, y: number): Cell => ({
  x: x + LEFT_EXPANSION_COLUMNS,
  y,
});
const fixedCell = (x: number, y: number): Cell => ({ x, y });
const FIXED_LAVA_CELLS: Cell[] = [
  fixedCell(1, 16),
  fixedCell(2, 16),
  fixedCell(3, 17),
  fixedCell(5, 2),
  fixedCell(10, 3),
  fixedCell(11, 3),
  fixedCell(12, 4),
  fixedCell(18, 15),
  fixedCell(19, 15),
  fixedCell(20, 16),
  fixedCell(27, 6),
  fixedCell(28, 6),
  fixedCell(28, 7),
  shifted(2, 15),
  shifted(3, 15),
  shifted(3, 16),
  shifted(4, 16),
  shifted(7, 3),
  shifted(8, 3),
  shifted(8, 4),
  shifted(15, 2),
  shifted(16, 2),
  shifted(16, 3),
  shifted(15, 15),
  shifted(16, 15),
  shifted(16, 16),
  shifted(12, 17),
  shifted(13, 17),
];
const FIXED_RESOURCE_PLACEMENTS: ResourcePlacement[] = [
  { cell: fixedCell(2, 9), resource: 'iron' },
  { cell: fixedCell(5, 4), resource: 'iron' },
  { cell: fixedCell(18, 7), resource: 'iron' },
  { cell: shifted(4, 8), resource: 'iron' },
  { cell: shifted(2, 5), resource: 'iron' },
  { cell: shifted(6, 16), resource: 'iron' },
  { cell: fixedCell(14, 5), resource: 'iron' },
  { cell: fixedCell(30, 11), resource: 'iron' },
  { cell: shifted(8, 12), resource: 'iron' },
  { cell: fixedCell(11, 12), resource: 'copper' },
  { cell: fixedCell(25, 15), resource: 'copper' },
  { cell: fixedCell(31, 5), resource: 'copper' },
  { cell: shifted(4, 14), resource: 'copper' },
  { cell: shifted(15, 6), resource: 'copper' },
  { cell: fixedCell(16, 14), resource: 'copper' },
  { cell: fixedCell(33, 7), resource: 'copper' },
  { cell: shifted(9, 4), resource: 'copper' },
  { cell: fixedCell(7, 14), resource: 'oil' },
  { cell: fixedCell(22, 10), resource: 'oil' },
  { cell: fixedCell(34, 13), resource: 'oil' },
  { cell: shifted(10, 8), resource: 'oil' },
  { cell: shifted(13, 14), resource: 'oil' },
  { cell: fixedCell(13, 16), resource: 'oil' },
  { cell: fixedCell(29, 3), resource: 'oil' },
  { cell: shifted(17, 13), resource: 'oil' },
];
const RESOURCE_TERRAIN: Record<ResourceKind, Terrain> = {
  iron: 'resource',
  copper: 'resourceCopper',
  oil: 'resourceOil',
};

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

  getResource(cell: Cell): ResourceKind | null {
    return this.tiles[cell.y]?.[cell.x]?.resource ?? null;
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
    const lava = new Set(FIXED_LAVA_CELLS.map((cell) => cellKey(cell)));
    const resources = new Map<string, ResourceKind>(
      FIXED_RESOURCE_PLACEMENTS.map((placement) => [
        cellKey(placement.cell),
        placement.resource,
      ]),
    );

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const key = `${x},${y}`;
        let terrain: Terrain = 'ground';
        const resource = resources.get(key);

        if (x >= GRID_WIDTH - 2) {
          terrain = 'ocean';
        } else if (lava.has(key)) {
          terrain = 'lava';
        } else if (resource) {
          terrain = RESOURCE_TERRAIN[resource];
        }

        row.push({
          terrain,
          resource:
            resource && terrain === RESOURCE_TERRAIN[resource]
              ? resource
              : undefined,
        });
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
