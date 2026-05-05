import Phaser from 'phaser';
import { Building } from '../entities/Building';
import {
  Cell,
  GRID_HEIGHT,
  GRID_WIDTH,
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

const RANDOM_LAVA_COUNT = 28;
const TOTAL_RESOURCE_COUNTS: Record<ResourceKind, number> = {
  iron: 9,
  copper: 8,
  oil: 8,
};
const STARTER_BASE_CELLS: Cell[] = [
  { x: 2, y: 9 },
  { x: 3, y: 9 },
  { x: 4, y: 9 },
  { x: 5, y: 9 },
  { x: 6, y: 9 },
  { x: 7, y: 9 },
  { x: 8, y: 9 },
  { x: 9, y: 9 },
  { x: 9, y: 10 },
  { x: 4, y: 11 },
  { x: 9, y: 11 },
  { x: 10, y: 11 },
  { x: 11, y: 11 },
];
const FIXED_RESOURCE_PLACEMENTS: ResourcePlacement[] = [
  { cell: { x: 2, y: 9 }, resource: 'iron' },
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
    const reserved = new Set(STARTER_BASE_CELLS.map((cell) => cellKey(cell)));
    const lava = this.randomCellKeys(RANDOM_LAVA_COUNT, reserved);
    const occupied = new Set([...reserved, ...lava]);
    const resources = new Map<string, ResourceKind>(
      FIXED_RESOURCE_PLACEMENTS.map((placement) => [
        cellKey(placement.cell),
        placement.resource,
      ]),
    );

    for (const [resource, totalCount] of Object.entries(TOTAL_RESOURCE_COUNTS) as [
      ResourceKind,
      number,
    ][]) {
      const fixedCount = FIXED_RESOURCE_PLACEMENTS.filter(
        (placement) => placement.resource === resource,
      ).length;
      const keys = this.randomCellKeys(
        Math.max(0, totalCount - fixedCount),
        occupied,
      );
      for (const key of keys) {
        occupied.add(key);
        resources.set(key, resource);
      }
    }

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

  private randomCellKeys(count: number, excluded: Set<string>): Set<string> {
    const candidates: string[] = [];
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH - 2; x += 1) {
        const key = `${x},${y}`;
        if (!excluded.has(key)) {
          candidates.push(key);
        }
      }
    }

    const shuffled = Phaser.Utils.Array.Shuffle(candidates);
    return new Set(shuffled.slice(0, count));
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
