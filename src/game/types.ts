export const GAME_WIDTH = 1180;
export const GAME_HEIGHT = 760;
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;
export const TILE_SIZE = 30;
export const MAP_ORIGIN_X = 248;
export const MAP_ORIGIN_Y = 42;

export type Direction = 'up' | 'right' | 'down' | 'left';
export type Terrain = 'ground' | 'lava' | 'geothermal' | 'resource' | 'ocean';
export type ItemType = 'ore' | 'ammo';
export type BuildingType =
  | 'core'
  | 'miner'
  | 'conveyor'
  | 'ammoFactory'
  | 'turret';
export type EnemyType = 'small' | 'heavy' | 'suicide';
export type UpgradeId = 'turret' | 'belt' | 'production' | 'repair';

export interface Cell {
  x: number;
  y: number;
}

export interface Tile {
  terrain: Terrain;
}

export interface BuildingDefinition {
  label: string;
  shortLabel: string;
  cost: number;
  maxHp: number;
  description: string;
}

export interface EnemyDefinition {
  label: string;
  maxHp: number;
  speed: number;
  damage: number;
  reward: number;
  color: number;
}

export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

export const DIRECTION_VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export const DIRECTION_ANGLES: Record<Direction, number> = {
  up: -90,
  right: 0,
  down: 90,
  left: 180,
};

export const BUILDING_DEFS: Record<BuildingType, BuildingDefinition> = {
  core: {
    label: 'コア',
    shortLabel: 'CORE',
    cost: 0,
    maxHp: 500,
    description: '防衛対象',
  },
  miner: {
    label: '採掘機',
    shortLabel: 'MIN',
    cost: 100,
    maxHp: 120,
    description: '資源ノードから鉄を生成して格納',
  },
  conveyor: {
    label: 'コンベア',
    shortLabel: 'BELT',
    cost: 10,
    maxHp: 55,
    description: '鉱石と弾薬を向きに沿って搬送',
  },
  ammoFactory: {
    label: '弾薬工場',
    shortLabel: 'AMMO',
    cost: 70,
    maxHp: 170,
    description: '格納した鉄を弾薬に変換',
  },
  turret: {
    label: 'タレット',
    shortLabel: 'GUN',
    cost: 85,
    maxHp: 140,
    description: '自分に弾薬がある時だけ攻撃',
  },
};

export const ENEMY_DEFS: Record<EnemyType, EnemyDefinition> = {
  small: {
    label: '小型ドローン',
    maxHp: 55,
    speed: 72,
    damage: 12,
    reward: 12,
    color: 0xde3030,
  },
  heavy: {
    label: '重装ドローン',
    maxHp: 150,
    speed: 42,
    damage: 18,
    reward: 26,
    color: 0x9c2d32,
  },
  suicide: {
    label: '自爆ドローン',
    maxHp: 75,
    speed: 58,
    damage: 70,
    reward: 18,
    color: 0xff6b1a,
  },
};

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function neighbor(cell: Cell, direction: Direction): Cell {
  const vector = DIRECTION_VECTORS[direction];
  return { x: cell.x + vector.x, y: cell.y + vector.y };
}

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function rotateDirection(direction: Direction): Direction {
  const index = DIRECTIONS.indexOf(direction);
  return DIRECTIONS[(index + 1) % DIRECTIONS.length];
}
