export const GAME_WIDTH = 1180;
export const GAME_HEIGHT = 760;
export const LEFT_EXPANSION_COLUMNS = 36;
export const GRID_WIDTH = 56;
export const GRID_HEIGHT = 20;
export const TILE_SIZE = 45;
export const MAP_ORIGIN_X = 0;
export const MAP_ORIGIN_Y = 0;
export const MAP_WIDTH_PX = GRID_WIDTH * TILE_SIZE;
export const MAP_HEIGHT_PX = GRID_HEIGHT * TILE_SIZE;
export const WORLD_VIEW_X = 232;
export const WORLD_VIEW_Y = 8;
export const WORLD_VIEW_WIDTH = GAME_WIDTH - WORLD_VIEW_X - 8;
export const WORLD_VIEW_HEIGHT = 638;

export type Direction = 'up' | 'right' | 'down' | 'left';
export type Terrain =
  | 'ground'
  | 'lava'
  | 'resource'
  | 'resourceCopper'
  | 'resourceOil'
  | 'ocean';
export type ResourceKind = 'iron' | 'copper' | 'oil';
export type ItemType =
  | 'ironOre'
  | 'copperOre'
  | 'oil'
  | 'ammo'
  | 'ironPlate'
  | 'copperPlate'
  | 'wire'
  | 'plastic'
  | 'fuel'
  | 'enhancedAmmo'
  | 'incendiaryAmmo'
  | 'empAmmo'
  | 'missile'
  | 'drone';
export type BuildingType =
  | 'core'
  | 'miner'
  | 'conveyor'
  | 'ammoFactory'
  | 'metalPlateFactory'
  | 'wireFactory'
  | 'plasticFactory'
  | 'fuelFactory'
  | 'specialAmmoFactory'
  | 'missileFactory'
  | 'droneFactory'
  | 'turret'
  | 'sniperTurret'
  | 'cannonTurret'
  | 'empTurret'
  | 'missileTurret'
  | 'droneTower'
  | 'wall';
export type EnemyType = 'small' | 'heavy' | 'suicide';
export type UpgradeId = 'turret' | 'belt' | 'production' | 'repair';
export type ConveyorVariant =
  | 'straight'
  | 'curveDown'
  | 'curveUp'
  | 'junctionThree'
  | 'junctionFour';

export interface Cell {
  x: number;
  y: number;
}

export interface Tile {
  terrain: Terrain;
  resource?: ResourceKind;
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

export interface ConveyorVariantDefinition {
  label: string;
  shortLabel: string;
  description: string;
  cost: number;
}

export interface ItemDefinition {
  label: string;
  shortLabel: string;
  color: number;
}

export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

export const CONVEYOR_VARIANTS: ConveyorVariant[] = [
  'straight',
  'curveDown',
  'curveUp',
  'junctionThree',
  'junctionFour',
];

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

export const ITEM_DEFS: Record<ItemType, ItemDefinition> = {
  ironOre: {
    label: '鉄',
    shortLabel: '鉄',
    color: 0xc7d4dc,
  },
  copperOre: {
    label: '銅',
    shortLabel: '銅',
    color: 0xd7863f,
  },
  oil: {
    label: '原油',
    shortLabel: '油',
    color: 0x2a1d38,
  },
  ammo: {
    label: '弾',
    shortLabel: '弾',
    color: 0xff8d3f,
  },
  ironPlate: {
    label: '鉄板',
    shortLabel: '鉄板',
    color: 0xd5e2ea,
  },
  copperPlate: {
    label: '銅板',
    shortLabel: '銅板',
    color: 0xe99a54,
  },
  wire: {
    label: 'ワイヤー',
    shortLabel: '線',
    color: 0xf4b552,
  },
  plastic: {
    label: 'プラスチック',
    shortLabel: '樹',
    color: 0xe5f6ff,
  },
  fuel: {
    label: '燃料',
    shortLabel: '燃',
    color: 0xffc34c,
  },
  enhancedAmmo: {
    label: '強化弾',
    shortLabel: '強',
    color: 0xffe073,
  },
  incendiaryAmmo: {
    label: '焼夷弾',
    shortLabel: '焼',
    color: 0xff6834,
  },
  empAmmo: {
    label: '電磁パルス弾',
    shortLabel: 'EMP',
    color: 0x68d7ff,
  },
  missile: {
    label: 'ミサイル',
    shortLabel: '弾頭',
    color: 0xfff0a6,
  },
  drone: {
    label: 'ドローン',
    shortLabel: '機',
    color: 0x9de8ff,
  },
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
    description: '資源ノードから鉄・銅・原油を採掘して格納',
  },
  conveyor: {
    label: 'コンベア',
    shortLabel: 'BELT',
    cost: 10,
    maxHp: 55,
    description: '施設間で物資を物理搬送。分岐は流れから自動判定',
  },
  ammoFactory: {
    label: '弾薬工場',
    shortLabel: 'AMMO',
    cost: 70,
    maxHp: 170,
    description: '格納した鉄を通常弾に変換',
  },
  metalPlateFactory: {
    label: '金属板工場',
    shortLabel: 'PLATE',
    cost: 120,
    maxHp: 170,
    description: '鉄と銅をそれぞれ金属板に加工',
  },
  wireFactory: {
    label: 'ワイヤー工場',
    shortLabel: 'WIRE',
    cost: 115,
    maxHp: 160,
    description: '銅をワイヤーに加工',
  },
  plasticFactory: {
    label: 'プラスチック工場',
    shortLabel: 'PLAS',
    cost: 130,
    maxHp: 160,
    description: '原油をプラスチックに加工',
  },
  fuelFactory: {
    label: '燃料工場',
    shortLabel: 'FUEL',
    cost: 130,
    maxHp: 160,
    description: '原油を燃料に加工',
  },
  specialAmmoFactory: {
    label: '特殊弾工場',
    shortLabel: 'SPAM',
    cost: 180,
    maxHp: 190,
    description: '強化弾、焼夷弾、EMP弾を製造',
  },
  missileFactory: {
    label: 'ミサイル工場',
    shortLabel: 'MSL',
    cost: 240,
    maxHp: 210,
    description: '鉄板2・ワイヤー2・燃料4からミサイルを製造',
  },
  droneFactory: {
    label: 'ドローン工場',
    shortLabel: 'DRN',
    cost: 260,
    maxHp: 210,
    description: '鉄板5・ワイヤー5・プラスチック5からドローンを製造',
  },
  turret: {
    label: 'タレット',
    shortLabel: 'GUN',
    cost: 85,
    maxHp: 140,
    description: '自分に弾薬がある時だけ攻撃',
  },
  sniperTurret: {
    label: 'スナイパータレット',
    shortLabel: 'SNP',
    cost: 180,
    maxHp: 130,
    description: '強化弾で長射程高威力攻撃',
  },
  cannonTurret: {
    label: '大型砲台',
    shortLabel: 'BOM',
    cost: 210,
    maxHp: 170,
    description: '焼夷弾で範囲攻撃',
  },
  empTurret: {
    label: '電磁砲台',
    shortLabel: 'EMP',
    cost: 220,
    maxHp: 160,
    description: 'EMP弾で敵を停止',
  },
  missileTurret: {
    label: 'ミサイル砲台',
    shortLabel: 'MSL',
    cost: 320,
    maxHp: 190,
    description: 'ミサイルで超長射程範囲攻撃',
  },
  droneTower: {
    label: 'ドローン司令塔',
    shortLabel: 'CTRL',
    cost: 300,
    maxHp: 180,
    description: 'ドローンを発進させる',
  },
  wall: {
    label: '防御壁',
    shortLabel: 'WALL',
    cost: 35,
    maxHp: 360,
    description: '敵の侵攻を受け止める高耐久壁',
  },
};

export const CONVEYOR_DEFS: Record<ConveyorVariant, ConveyorVariantDefinition> = {
  straight: {
    label: 'コンベア直進',
    shortLabel: 'I',
    description: 'ドラッグ時は進行方向へ自動接続。曲がりも自動判定',
    cost: 10,
  },
  curveDown: {
    label: '自動カーブ 左→下',
    shortLabel: 'L↓',
    description: '左から入り下へ出る',
    cost: 10,
  },
  curveUp: {
    label: '自動カーブ 左→上',
    shortLabel: 'L↑',
    description: '左から入り上へ出る',
    cost: 10,
  },
  junctionThree: {
    label: 'T字コンベア',
    shortLabel: 'T',
    description: '3方向を接続。来た方向以外へ自動分配',
    cost: 15,
  },
  junctionFour: {
    label: '十字コンベア',
    shortLabel: '+',
    description: '4方向を接続。空き方向へ自動分配',
    cost: 20,
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

export function storageCapacity(type: BuildingType, item: ItemType): number {
  if (type === 'core') {
    return 120;
  }

  if (type === 'conveyor') {
    return 1;
  }

  if (type === 'miner') {
    return item === 'ironOre' || item === 'copperOre' || item === 'oil' ? 8 : 0;
  }

  if (type === 'ammoFactory') {
    if (item === 'ironOre') {
      return 12;
    }
    return item === 'ammo' ? 8 : 0;
  }

  if (type === 'metalPlateFactory') {
    return item === 'ironOre' ||
      item === 'copperOre' ||
      item === 'ironPlate' ||
      item === 'copperPlate'
      ? 12
      : 0;
  }

  if (type === 'wireFactory') {
    return item === 'copperOre' || item === 'wire' ? 12 : 0;
  }

  if (type === 'plasticFactory') {
    return item === 'oil' || item === 'plastic' ? 12 : 0;
  }

  if (type === 'fuelFactory') {
    return item === 'oil' || item === 'fuel' ? 12 : 0;
  }

  if (type === 'specialAmmoFactory') {
    return item === 'ironPlate' ||
      item === 'copperPlate' ||
      item === 'wire' ||
      item === 'plastic' ||
      item === 'fuel' ||
      item === 'enhancedAmmo' ||
      item === 'incendiaryAmmo' ||
      item === 'empAmmo'
      ? 12
      : 0;
  }

  if (type === 'missileFactory') {
    return item === 'ironPlate' ||
      item === 'wire' ||
      item === 'fuel' ||
      item === 'missile'
      ? 16
      : 0;
  }

  if (type === 'droneFactory') {
    return item === 'ironPlate' ||
      item === 'wire' ||
      item === 'plastic' ||
      item === 'drone'
      ? 18
      : 0;
  }

  if (type === 'turret') {
    return item === 'ammo' ? 36 : 0;
  }

  if (type === 'sniperTurret') {
    return item === 'enhancedAmmo' ? 18 : 0;
  }

  if (type === 'cannonTurret') {
    return item === 'incendiaryAmmo' ? 18 : 0;
  }

  if (type === 'empTurret') {
    return item === 'empAmmo' ? 18 : 0;
  }

  if (type === 'missileTurret') {
    return item === 'missile' ? 8 : 0;
  }

  if (type === 'droneTower') {
    return item === 'drone' ? 6 : 0;
  }

  return 0;
}

export function rotateDirection(direction: Direction): Direction {
  const index = DIRECTIONS.indexOf(direction);
  return DIRECTIONS[(index + 1) % DIRECTIONS.length];
}
