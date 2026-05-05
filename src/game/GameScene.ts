import Phaser from 'phaser';
import areaExplosionsUrl from '../../assets/images/area-explosions-generated.png';
import generatedBuildingSpritesUrl from '../../assets/sprites/generated-building-sprites.png';
import generatedConveyorsUrl from '../../assets/sprites/generated-conveyors.png';
import generatedSpritesUrl from '../../assets/sprites/generated-sprites.png';
import undergroundConveyorsUrl from '../../assets/sprites/underground-conveyors-generated.png';
import { Bullet } from './entities/Bullet';
import { Building } from './entities/Building';
import { CombatDrone } from './entities/CombatDrone';
import { Enemy } from './entities/Enemy';
import { FactorySystem } from './systems/FactorySystem';
import { GridSystem } from './systems/GridSystem';
import { createPixelTextures } from './systems/TextureFactory';
import { UpgradeSystem } from './systems/UpgradeSystem';
import { WaveSystem } from './systems/WaveSystem';
import {
  BUILDING_DEFS,
  BuildingType,
  Cell,
  CONVEYOR_DEFS,
  ConveyorVariant,
  DIRECTION_ANGLES,
  Direction,
  EnemyType,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_HEIGHT,
  GRID_WIDTH,
  ITEM_DEFS,
  ItemType,
  MAP_HEIGHT_PX,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  MAP_WIDTH_PX,
  TILE_SIZE,
  ResourceKind,
  UpgradeId,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_WIDTH,
  WORLD_VIEW_X,
  WORLD_VIEW_Y,
  manhattan,
  neighbor,
  rotateDirection,
  sameCell,
  storageCapacity,
} from './types';

type BuildableType = Exclude<BuildingType, 'core'>;

interface BuildOption {
  id: string;
  type: BuildableType;
  conveyorVariant?: ConveyorVariant;
  label: string;
  detail: string;
  iconKey: string;
}

type BuildGroupId = 'basic' | 'logistics' | 'production' | 'defense';

interface BuildGroupDefinition {
  id: BuildGroupId;
  label: string;
  optionIds: string[];
}

interface StageDefinition {
  id: number;
  label: string;
  unlockWave: number;
  objective: string;
  unlockSummary: string;
  unlockCards: RecipeGuideCard[];
}

interface RecipeGuideCard {
  title: string;
  subtitle: string;
  body: string;
  icons: string[];
  accent: number;
}

interface RecipeGuidePage {
  title: string;
  cards: RecipeGuideCard[];
}

const BUILD_OPTIONS: BuildOption[] = [
  {
    id: 'miner',
    type: 'miner',
    label: '採掘機',
    detail: '資源を採掘',
    iconKey: 'building-miner',
  },
  {
    id: 'conveyor-straight',
    type: 'conveyor',
    conveyorVariant: 'straight',
    label: 'コンベア直進',
    detail: '向きへ搬送・曲がり自動',
    iconKey: 'building-conveyor',
  },
  {
    id: 'conveyor-junction-three',
    type: 'conveyor',
    conveyorVariant: 'junctionThree',
    label: 'T字コンベア',
    detail: '3方向を自動分配',
    iconKey: 'conveyor-junctionThree',
  },
  {
    id: 'conveyor-junction-four',
    type: 'conveyor',
    conveyorVariant: 'junctionFour',
    label: '十字コンベア',
    detail: '4方向を自動分配',
    iconKey: 'conveyor-junctionFour',
  },
  {
    id: 'conveyor-underground-input',
    type: 'conveyor',
    conveyorVariant: 'undergroundInput',
    label: '地下入口',
    detail: '5マス先へ送る',
    iconKey: 'conveyor-undergroundInput',
  },
  {
    id: 'conveyor-underground-output',
    type: 'conveyor',
    conveyorVariant: 'undergroundOutput',
    label: '地下出口',
    detail: '地下から出す',
    iconKey: 'conveyor-undergroundOutput',
  },
  {
    id: 'ammoFactory',
    type: 'ammoFactory',
    label: '弾薬工場',
    detail: '鉄を弾に変換',
    iconKey: 'building-ammoFactory',
  },
  {
    id: 'metalPlateFactory',
    type: 'metalPlateFactory',
    label: '金属板工場',
    detail: '鉄板/銅板',
    iconKey: 'building-metalPlateFactory',
  },
  {
    id: 'wireFactory',
    type: 'wireFactory',
    label: 'ワイヤー工場',
    detail: '銅→ワイヤー',
    iconKey: 'building-wireFactory',
  },
  {
    id: 'plasticFactory',
    type: 'plasticFactory',
    label: 'プラスチック工場',
    detail: '原油→樹脂',
    iconKey: 'building-plasticFactory',
  },
  {
    id: 'fuelFactory',
    type: 'fuelFactory',
    label: '燃料工場',
    detail: '原油→燃料',
    iconKey: 'building-fuelFactory',
  },
  {
    id: 'specialAmmoFactory',
    type: 'specialAmmoFactory',
    label: '特殊弾工場',
    detail: '強/焼/EMP弾',
    iconKey: 'building-specialAmmoFactory',
  },
  {
    id: 'missileFactory',
    type: 'missileFactory',
    label: 'ミサイル工場',
    detail: '素材→弾頭',
    iconKey: 'building-missileFactory',
  },
  {
    id: 'droneFactory',
    type: 'droneFactory',
    label: 'ドローン工場',
    detail: '素材→機体',
    iconKey: 'building-droneFactory',
  },
  {
    id: 'turret',
    type: 'turret',
    label: 'タレット',
    detail: '弾を消費して攻撃',
    iconKey: 'building-turret',
  },
  {
    id: 'sniperTurret',
    type: 'sniperTurret',
    label: 'スナイパー',
    detail: '強化弾・長射程',
    iconKey: 'building-sniperTurret',
  },
  {
    id: 'cannonTurret',
    type: 'cannonTurret',
    label: '大型砲台',
    detail: '焼夷弾・範囲',
    iconKey: 'building-cannonTurret',
  },
  {
    id: 'empTurret',
    type: 'empTurret',
    label: '電磁砲台',
    detail: 'EMP弾・停止',
    iconKey: 'building-empTurret',
  },
  {
    id: 'missileTurret',
    type: 'missileTurret',
    label: 'ミサイル砲台',
    detail: '弾頭・超長射程',
    iconKey: 'building-missileTurret',
  },
  {
    id: 'droneTower',
    type: 'droneTower',
    label: 'ドローン司令塔',
    detail: '機体を発進',
    iconKey: 'building-droneTower',
  },
  {
    id: 'wall',
    type: 'wall',
    label: '防御壁',
    detail: '敵を足止めする高耐久壁',
    iconKey: 'building-wall',
  },
];

const BUILD_GROUPS: BuildGroupDefinition[] = [
  {
    id: 'basic',
    label: '基本施設',
    optionIds: ['miner', 'wall'],
  },
  {
    id: 'logistics',
    label: '搬送ライン',
    optionIds: [
      'conveyor-straight',
      'conveyor-junction-three',
      'conveyor-junction-four',
      'conveyor-underground-input',
      'conveyor-underground-output',
    ],
  },
  {
    id: 'production',
    label: '加工工場',
    optionIds: [
      'ammoFactory',
      'metalPlateFactory',
      'wireFactory',
      'plasticFactory',
      'fuelFactory',
      'specialAmmoFactory',
      'missileFactory',
      'droneFactory',
    ],
  },
  {
    id: 'defense',
    label: '防衛兵器',
    optionIds: [
      'turret',
      'sniperTurret',
      'cannonTurret',
      'empTurret',
      'missileTurret',
      'droneTower',
    ],
  },
];

const STAGE_DEFS: StageDefinition[] = [
  {
    id: 1,
    label: 'STAGE 1 鉄と通常弾',
    unlockWave: 0,
    objective: '鉄を掘り、弾薬工場からタレットへ弾を送る',
    unlockSummary: '採掘機 / 直線搬送 / 弾薬工場 / タレット',
    unlockCards: [
      {
        title: '採掘機',
        subtitle: '資源マスに置く',
        body: '鉄鉱床に置き、向きの先へ鉄を出します。まず弾薬工場までつないでください。',
        icons: ['tile-resource', 'building-miner', 'item-ironOre'],
        accent: 0xc7d4dc,
      },
      {
        title: 'コンベア直進',
        subtitle: '物資の道を作る',
        body: '採掘機、工場、タレットを接続します。ドラッグすると曲がりも自動で整います。',
        icons: ['building-conveyor', 'item-ironOre', 'item-ammo'],
        accent: 0xf3c53c,
      },
      {
        title: '弾薬工場',
        subtitle: '鉄 -> 通常弾',
        body: '鉄を受け取ると通常弾を作ります。完成した弾はタレットへ搬送します。',
        icons: ['building-ammoFactory', 'item-ironOre', 'item-ammo'],
        accent: 0xff8d3f,
      },
      {
        title: 'タレット / 防御壁',
        subtitle: '序盤防衛の基本',
        body: 'タレットは通常弾がある時だけ撃ちます。壁は敵の進路を受け止めます。',
        icons: ['building-turret', 'building-wall', 'item-ammo'],
        accent: 0xffcf65,
      },
    ],
  },
  {
    id: 2,
    label: 'STAGE 2 銅と強化弾',
    unlockWave: 1,
    objective: '銅を加工し、強化弾で重装ドローンに備える',
    unlockSummary: '銅加工 / 分岐搬送 / 特殊弾 / スナイパー',
    unlockCards: [
      {
        title: 'T字 / 十字コンベア',
        subtitle: 'ラインを分配する',
        body: '1本の素材ラインを複数工場へ分けます。片側が詰まっても空き方向へ流します。',
        icons: ['conveyor-junctionThree', 'conveyor-junctionFour', 'item-copperOre'],
        accent: 0xf3c53c,
      },
      {
        title: '金属板工場',
        subtitle: '鉄/銅 -> 板',
        body: '鉄板と銅板を作ります。特殊弾や大型兵器の土台になる中間素材です。',
        icons: ['building-metalPlateFactory', 'item-ironPlate', 'item-copperPlate'],
        accent: 0xd5e2ea,
      },
      {
        title: 'ワイヤー工場',
        subtitle: '銅 -> ワイヤー',
        body: '銅をワイヤーへ加工します。EMP弾、ミサイル、ドローンに使います。',
        icons: ['building-wireFactory', 'item-copperOre', 'item-wire'],
        accent: 0xf4b552,
      },
      {
        title: '特殊弾 / スナイパー',
        subtitle: '重装敵に備える',
        body: '鉄板+銅板で強化弾を作り、スナイパーへ送ると長射程高威力で撃てます。',
        icons: ['building-specialAmmoFactory', 'item-enhancedAmmo', 'building-sniperTurret'],
        accent: 0xffe073,
      },
    ],
  },
  {
    id: 3,
    label: 'STAGE 3 原油と範囲制圧',
    unlockWave: 3,
    objective: '原油を燃料と樹脂に分け、焼夷弾とEMPを作る',
    unlockSummary: '化学工場 / 地下搬送 / 大型砲台 / EMP砲台',
    unlockCards: [
      {
        title: '地下コンベア',
        subtitle: 'ラインを交差させる',
        body: '入口から向きの先5マス以内の出口へ送ります。混雑する工場前を迂回できます。',
        icons: ['conveyor-undergroundInput', 'conveyor-undergroundOutput', 'building-conveyor'],
        accent: 0x7ddcff,
      },
      {
        title: '化学工場',
        subtitle: '原油 -> 樹脂/燃料',
        body: 'プラスチック工場は樹脂、燃料工場は燃料を作ります。特殊弾の素材です。',
        icons: ['building-plasticFactory', 'building-fuelFactory', 'item-oil'],
        accent: 0x9de8ff,
      },
      {
        title: '大型砲台',
        subtitle: '焼夷弾で範囲攻撃',
        body: '鉄板+燃料で焼夷弾を作り、大型砲台へ送ると密集した敵をまとめて削れます。',
        icons: ['building-specialAmmoFactory', 'item-incendiaryAmmo', 'building-cannonTurret'],
        accent: 0xff6834,
      },
      {
        title: '電磁砲台',
        subtitle: 'EMP弾で足止め',
        body: 'ワイヤー+樹脂でEMP弾を作ります。敵を止めて他の砲台の時間を稼ぎます。',
        icons: ['item-wire', 'item-empAmmo', 'building-empTurret'],
        accent: 0x68d7ff,
      },
    ],
  },
  {
    id: 4,
    label: 'STAGE 4 大型兵器',
    unlockWave: 5,
    objective: 'ミサイルかドローンの長い生産ラインを完成させる',
    unlockSummary: 'ミサイル / ドローン / 長射程防衛',
    unlockCards: [
      {
        title: 'ミサイル工場',
        subtitle: '鉄板2+線2+燃料4',
        body: '重い素材をまとめてミサイルにします。安定供給には分岐と地下搬送が有効です。',
        icons: ['building-missileFactory', 'item-ironPlate', 'item-missile'],
        accent: 0xfff0a6,
      },
      {
        title: 'ミサイル砲台',
        subtitle: '超長射程の範囲攻撃',
        body: 'ミサイルを受け取ると遠くの敵群を爆破します。発射間隔は長いので弾切れに注意します。',
        icons: ['building-missileTurret', 'item-missile'],
        accent: 0xff8d3f,
      },
      {
        title: 'ドローン工場',
        subtitle: '板5+線5+樹脂5',
        body: 'ドローン機体を作ります。素材消費が重いので、余剰ラインから作ると安定します。',
        icons: ['building-droneFactory', 'item-wire', 'item-drone'],
        accent: 0x9de8ff,
      },
      {
        title: 'ドローン司令塔',
        subtitle: '自動追撃を発進',
        body: 'ドローンを受け取ると戦闘中に発進します。抜けてきた敵への追撃に向きます。',
        icons: ['building-droneTower', 'item-drone'],
        accent: 0x9de8ff,
      },
    ],
  },
];

const BUILD_OPTION_UNLOCK_WAVES: Record<string, number> = {
  miner: 0,
  'conveyor-straight': 0,
  ammoFactory: 0,
  turret: 0,
  wall: 0,
  'conveyor-junction-three': 1,
  'conveyor-junction-four': 1,
  metalPlateFactory: 1,
  wireFactory: 1,
  specialAmmoFactory: 1,
  sniperTurret: 1,
  'conveyor-underground-input': 3,
  'conveyor-underground-output': 3,
  plasticFactory: 3,
  fuelFactory: 3,
  cannonTurret: 3,
  empTurret: 3,
  missileFactory: 5,
  droneFactory: 5,
  missileTurret: 5,
  droneTower: 5,
};

const BUILDING_INPUT_HINTS: Partial<Record<BuildingType, string>> = {
  ammoFactory: '鉄を入れると通常弾を作ります',
  metalPlateFactory: '鉄か銅を入れると金属板を作ります',
  wireFactory: '銅を入れるとワイヤーを作ります',
  plasticFactory: '原油を入れると樹脂を作ります',
  fuelFactory: '原油を入れると燃料を作ります',
  specialAmmoFactory: '鉄板+銅板、鉄板+燃料、線+樹脂を受け取ります',
  missileFactory: '鉄板2+線2+燃料4を受け取ります',
  droneFactory: '鉄板5+線5+樹脂5を受け取ります',
};

const BUILDING_PRODUCT_ITEMS: Partial<Record<BuildingType, ItemType[]>> = {
  miner: ['ironOre', 'copperOre', 'oil'],
  ammoFactory: ['ammo'],
  metalPlateFactory: ['ironPlate', 'copperPlate'],
  wireFactory: ['wire'],
  plasticFactory: ['plastic'],
  fuelFactory: ['fuel'],
  specialAmmoFactory: ['enhancedAmmo', 'incendiaryAmmo', 'empAmmo'],
  missileFactory: ['missile'],
  droneFactory: ['drone'],
};

const BUILD_OPTION_BY_ID = new Map(BUILD_OPTIONS.map((option) => [option.id, option]));
const BUILD_MENU_START_Y = 306;
const BUILD_MENU_HEADER_HEIGHT = 30;
const BUILD_MENU_CARD_HEIGHT = 76;
const BUILD_MENU_GAP = 4;
const BUILD_MENU_AFTER_EXPANDED_GAP = 14;
const BUILD_MENU_CARD_WIDTH = 102;
const BUILD_MENU_CARD_COLUMNS = [72, 178];
const BUILD_MENU_TEXT_RESOLUTION = 3;

const RECIPE_GUIDE_PAGES: RecipeGuidePage[] = [
  {
    title: '資源と加工ライン',
    cards: [
      {
        title: '鉄鉱床 + 採掘機',
        subtitle: '鉄を掘る',
        body: '鉄の資源マスに採掘機を置くと、向きの方向へ鉄を排出します。',
        icons: ['tile-resource', 'building-miner', 'item-ironOre'],
        accent: 0xc7d4dc,
      },
      {
        title: '銅鉱床 + 採掘機',
        subtitle: '銅を掘る',
        body: '銅の資源マスから銅を採掘し、銅板やワイヤーの材料にします。',
        icons: ['tile-resourceCopper', 'building-miner', 'item-copperOre'],
        accent: 0xd7863f,
      },
      {
        title: '原油マス + 採掘機',
        subtitle: '原油を掘る',
        body: '黒い原油マスから原油を採掘し、プラスチックや燃料に加工します。',
        icons: ['tile-resourceOil', 'building-miner', 'item-oil'],
        accent: 0x7a7dff,
      },
      {
        title: '搬送ライン',
        subtitle: '物資を運ぶ',
        body: '直進、T字、十字、地下コンベアで施設間を接続します。分岐は流れから自動判定します。',
        icons: ['building-conveyor', 'conveyor-junctionThree', 'conveyor-undergroundInput', 'conveyor-undergroundOutput'],
        accent: 0xf3c53c,
      },
      {
        title: '弾薬工場',
        subtitle: '鉄 -> 弾',
        body: '施設内に鉄が入ると通常弾を作ります。弾はタレットへ搬送してください。',
        icons: ['building-ammoFactory', 'item-ironOre', 'item-ammo'],
        accent: 0xff8d3f,
      },
      {
        title: '金属板工場',
        subtitle: '鉄/銅 -> 板',
        body: '鉄から鉄板、銅から銅板を作ります。特殊弾や大型生産の基本材料です。',
        icons: ['building-metalPlateFactory', 'item-ironPlate', 'item-copperPlate'],
        accent: 0xd5e2ea,
      },
      {
        title: 'ワイヤー工場',
        subtitle: '銅 -> ワイヤー',
        body: '銅をワイヤーに加工します。EMP弾、ミサイル、ドローンの材料になります。',
        icons: ['building-wireFactory', 'item-copperOre', 'item-wire'],
        accent: 0xf4b552,
      },
      {
        title: '化学工場',
        subtitle: '原油 -> 樹脂/燃料',
        body: 'プラスチック工場は樹脂、燃料工場は燃料を作ります。',
        icons: ['building-plasticFactory', 'building-fuelFactory', 'item-plastic', 'item-fuel'],
        accent: 0x9de8ff,
      },
    ],
  },
  {
    title: '特殊生産と防衛兵器',
    cards: [
      {
        title: '特殊弾工場',
        subtitle: '強化/焼夷/EMP弾',
        body: '鉄板+銅板で強化弾、鉄板+燃料で焼夷弾、ワイヤー+樹脂でEMP弾を作ります。',
        icons: ['building-specialAmmoFactory', 'item-enhancedAmmo', 'item-incendiaryAmmo', 'item-empAmmo'],
        accent: 0xffcf65,
      },
      {
        title: 'ミサイル工場',
        subtitle: '鉄板2+線2+燃料4',
        body: '素材をまとめてミサイルにします。ミサイル砲台専用の弾薬です。',
        icons: ['building-missileFactory', 'item-ironPlate', 'item-wire', 'item-missile'],
        accent: 0xfff0a6,
      },
      {
        title: 'ドローン工場',
        subtitle: '板5+線5+樹脂5',
        body: 'ドローンを製造します。完成品だけがドローン司令塔へ出荷されます。',
        icons: ['building-droneFactory', 'item-ironPlate', 'item-wire', 'item-drone'],
        accent: 0x9de8ff,
      },
      {
        title: 'タレット',
        subtitle: '通常弾',
        body: '弾を消費して近距離の敵を連射します。序盤防衛の基本です。',
        icons: ['building-turret', 'item-ammo'],
        accent: 0xffcf65,
      },
      {
        title: 'スナイパー',
        subtitle: '強化弾',
        body: '強化弾のみ使用。通常タレットの3倍射程、3倍威力、低速射撃です。',
        icons: ['building-sniperTurret', 'item-enhancedAmmo'],
        accent: 0xffe073,
      },
      {
        title: '大型砲台 / 電磁砲台',
        subtitle: '焼夷弾 / EMP弾',
        body: '大型砲台は範囲ダメージ、電磁砲台は範囲内の敵を3秒停止します。',
        icons: ['building-cannonTurret', 'building-empTurret', 'item-incendiaryAmmo', 'item-empAmmo'],
        accent: 0x68d7ff,
      },
      {
        title: 'ミサイル砲台',
        subtitle: 'ミサイル',
        body: '超長射程かつ高威力の範囲攻撃。発射間隔はかなり長めです。',
        icons: ['building-missileTurret', 'item-missile'],
        accent: 0xff8d3f,
      },
      {
        title: 'ドローン司令塔',
        subtitle: 'ドローン',
        body: 'ドローンを発進させ、一番近い敵へ向かわせます。飛行中も射撃します。',
        icons: ['building-droneTower', 'item-drone'],
        accent: 0x9de8ff,
      },
    ],
  },
];

type WeaponBuildingType =
  | 'turret'
  | 'sniperTurret'
  | 'cannonTurret'
  | 'empTurret'
  | 'missileTurret';
type WeaponSoundType = WeaponBuildingType | 'droneTower' | 'combatDrone';
type AreaExplosionType = 'incendiary' | 'emp' | 'missile';

interface WeaponConfig {
  ammo: ItemType;
  rangeMultiplier: number;
  damageMultiplier: number;
  fireIntervalMultiplier: number;
  color: number;
  radius?: number;
  stunMs?: number;
  areaEffect?: AreaExplosionType;
}

const WEAPON_CONFIGS: Record<WeaponBuildingType, WeaponConfig> = {
  turret: {
    ammo: 'ammo',
    rangeMultiplier: 1,
    damageMultiplier: 1,
    fireIntervalMultiplier: 1,
    color: 0xffcf65,
  },
  sniperTurret: {
    ammo: 'enhancedAmmo',
    rangeMultiplier: 3,
    damageMultiplier: 3,
    fireIntervalMultiplier: 4,
    color: 0xffe073,
  },
  cannonTurret: {
    ammo: 'incendiaryAmmo',
    rangeMultiplier: 2,
    damageMultiplier: 1.6,
    fireIntervalMultiplier: 1.7,
    color: 0xff6834,
    radius: 72,
    areaEffect: 'incendiary',
  },
  empTurret: {
    ammo: 'empAmmo',
    rangeMultiplier: 2,
    damageMultiplier: 0,
    fireIntervalMultiplier: 2.2,
    color: 0x68d7ff,
    radius: 78,
    stunMs: 3000,
    areaEffect: 'emp',
  },
  missileTurret: {
    ammo: 'missile',
    rangeMultiplier: 5,
    damageMultiplier: 10,
    fireIntervalMultiplier: 10,
    color: 0xfff0a6,
    radius: 96,
    areaEffect: 'missile',
  },
};

type InteractionMode = 'build' | 'move' | 'demolish';

interface BuildButton {
  option: BuildOption;
  box: Phaser.GameObjects.Rectangle;
}

interface SavedBuildingState {
  type: BuildingType;
  cell: Cell;
  direction: Direction;
  conveyorVariant: ConveyorVariant;
  hp: number;
  alive: boolean;
  item: ItemType | null;
  storage: Partial<Record<ItemType, number>>;
}

interface SavedFactoryState {
  version: 1;
  buildings: SavedBuildingState[];
}

const FACTORY_SAVE_KEY = 'cape-verde-factory.factoryState.v1';

export class GameScene extends Phaser.Scene {
  grid!: GridSystem;
  factory!: FactorySystem;
  wave!: WaveSystem;
  upgrades!: UpgradeSystem;
  core!: Building;
  parts = 420;
  modifiers = {
    turretDamage: 34,
    turretRange: 165,
    beltIntervalMs: 520,
    productionIntervalMs: 1650,
    ammoSaveChance: 0,
    specialDamageMultiplier: 1,
    droneDamageMultiplier: 1,
  };

  private selectedBuild: BuildableType = 'conveyor';
  private selectedConveyorVariant: ConveyorVariant = 'straight';
  private direction: Direction = 'right';
  private mode: InteractionMode = 'build';
  private movingBuilding: Building | null = null;
  private readonly enemies: Enemy[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly drones: CombatDrone[] = [];
  private preview!: Phaser.GameObjects.Graphics;
  private buildButtons: BuildButton[] = [];
  private readonly buildMenuObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly expandedBuildGroups = new Set<BuildGroupId>();
  private recipeOverlay?: Phaser.GameObjects.Container;
  private recipePage = 0;
  private worldCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private readonly worldObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly uiObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private isPanning = false;
  private spacePanning = false;
  private lastPanPoint: Phaser.Math.Vector2 | null = null;
  private isConveyorPainting = false;
  private lastConveyorPaintCell: Cell | null = null;
  private isDemolishDragging = false;
  private lastDemolishCell: Cell | null = null;
  private gameEnded = false;
  private statusMessage = '準備フェーズでラインを組み、準備完了で戦闘開始';
  private statusUntil = 0;
  private audioContext?: AudioContext;
  private stageUnlockOverlay?: Phaser.GameObjects.Container;
  private ui!: {
    wave: Phaser.GameObjects.Text;
    stage: Phaser.GameObjects.Text;
    phase: Phaser.GameObjects.Text;
    core: Phaser.GameObjects.Text;
    parts: Phaser.GameObjects.Text;
    ore: Phaser.GameObjects.Text;
    ammo: Phaser.GameObjects.Text;
    selected: Phaser.GameObjects.Text;
    status: Phaser.GameObjects.Text;
    readyButton: Phaser.GameObjects.Rectangle;
    readyText: Phaser.GameObjects.Text;
    repairButton: Phaser.GameObjects.Rectangle;
    repairText: Phaser.GameObjects.Text;
    recipeButton: Phaser.GameObjects.Rectangle;
    recipeText: Phaser.GameObjects.Text;
    moveButton: Phaser.GameObjects.Rectangle;
    moveText: Phaser.GameObjects.Text;
    demolishButton: Phaser.GameObjects.Rectangle;
    demolishText: Phaser.GameObjects.Text;
  };

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.spritesheet('generated-sprites', generatedSpritesUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('generated-conveyors', generatedConveyorsUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('generated-building-sprites', generatedBuildingSpritesUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('underground-conveyors', undergroundConveyorsUrl, {
      frameWidth: 30,
      frameHeight: 30,
    });
    this.load.image('area-explosions-generated', areaExplosionsUrl);
  }

  create(): void {
    createPixelTextures(this);
    this.replaceGeneratedTextures();
    this.createAreaExplosionTextures();
    this.createBackdrop();

    this.grid = new GridSystem();
    this.grid.render(this);
    this.factory = new FactorySystem(this, this.grid);
    this.wave = new WaveSystem(this);
    this.upgrades = new UpgradeSystem(this);
    this.preview = this.add.graphics().setDepth(85);

    this.createPools();
    this.createFactoryFromSaveOrStarterBase();
    this.captureInitialWorldObjects();
    this.configureCameras();
    this.createUi();
    this.captureInitialUiObjects();
    this.createInput();
    this.createHitEvents();
    this.wave.startPreparation();
    this.showStageUnlockOverlay(STAGE_DEFS[0]);
  }

  update(time: number, delta: number): void {
    if (this.gameEnded) {
      this.updatePreview();
      return;
    }

    this.factory.update(time);
    this.updateTurrets(time);
    this.updateDroneTowers(time);
    this.updateDrones(time, delta);
    this.enemies.forEach((enemy) => enemy.update(time, delta));
    this.bullets.forEach((bullet) => bullet.update(delta));
    this.wave.update(time);
    this.updateCameraControls(delta);
    this.grid.updateCulling(this.worldCamera);
    this.updateUi(time);
    this.updatePreview();
  }

  spawnEnemy(type: EnemyType, wave: number): void {
    const enemy = this.enemies.find((candidate) => !candidate.active) ?? this.addEnemy();
    enemy.spawn(type, this.grid.randomSpawnCell(wave), wave);
  }

  hasActiveEnemies(): boolean {
    return this.enemies.some((enemy) => enemy.active);
  }

  damageBuilding(building: Building, amount: number): void {
    const destroyed = building.damage(amount);
    this.cameras.main.shake(45, 0.0016);

    if (destroyed) {
      this.explosion(building.getWorldPosition(), building.type === 'core' ? 0x37cfff : 0xff6b1a);
      this.setStatus(`${BUILDING_DEFS[building.type].label}が破壊された`);
    }

    if (building.type === 'core' && building.hp <= 0) {
      this.gameOver();
    }
  }

  damageBuildingArea(cell: Cell, amount: number): void {
    for (const building of this.grid.allBuildings()) {
      if (building.alive && manhattan(building.cell, cell) <= 1) {
        this.damageBuilding(building, amount);
      }
    }
  }

  onEnemyKilled(reward: number, position: Phaser.Math.Vector2): void {
    this.parts += reward;
    this.floatText(position, `+${reward}`, 0xf3d26a);
    this.explosion(position, 0xff9b38, 0.55);
  }

  onWaveCleared(wave: number): void {
    const bonus = 90 + wave * 35;
    this.parts += bonus;
    const unlockedStage = STAGE_DEFS.find((stage) => stage.unlockWave === wave);
    const unlockText = unlockedStage
      ? ` / ${unlockedStage.label}解禁: ${unlockedStage.unlockSummary}`
      : '';
    this.setStatus(`ウェーブ${wave}クリア: 建材+${bonus}${unlockText}`, 4200);
    this.createBuildMenu();
    if (unlockedStage) {
      this.showStageUnlockOverlay(unlockedStage);
    }
  }

  applyUpgrade(id: UpgradeId): void {
    if (id === 'turret') {
      this.modifiers.turretDamage *= 1.2;
      this.setStatus('タレット攻撃力が上昇');
    } else if (id === 'belt') {
      this.modifiers.beltIntervalMs = Math.max(
        180,
        Math.floor(this.modifiers.beltIntervalMs * 0.82),
      );
      this.setStatus('コンベア速度が上昇');
    } else if (id === 'production') {
      this.modifiers.productionIntervalMs = Math.max(
        620,
        Math.floor(this.modifiers.productionIntervalMs * 0.82),
      );
      this.setStatus('生産速度が上昇');
    } else if (id === 'repair') {
      this.core.heal(120);
      this.setStatus('コアHPを回復');
    } else if (id === 'ammoSaver') {
      this.modifiers.ammoSaveChance = Math.min(
        0.45,
        this.modifiers.ammoSaveChance + 0.16,
      );
      this.setStatus('弾薬節約率が上昇');
    } else if (id === 'specialist') {
      this.modifiers.specialDamageMultiplier *= 1.25;
      this.setStatus('特殊兵器の威力が上昇');
    } else if (id === 'droneOps') {
      this.modifiers.droneDamageMultiplier *= 1.35;
      this.setStatus('ドローン火力が上昇');
    } else {
      this.parts += 220;
      this.setStatus('追加建材を確保');
    }
  }

  isUpgradeUnlocked(id: UpgradeId): boolean {
    if (id === 'ammoSaver' || id === 'specialist') {
      return this.wave.wave >= 1;
    }

    if (id === 'droneOps') {
      return this.wave.wave >= 5;
    }

    return true;
  }

  setStatus(message: string, durationMs = 2200): void {
    this.statusMessage = message;
    this.statusUntil = this.time.now + durationMs;
    this.ui?.status.setText(message);
  }

  floatText(
    position: Phaser.Math.Vector2,
    label: string,
    color: number,
  ): void {
    const text = this.add
      .text(position.x, position.y - 18, label, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '13px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.registerWorldObject(text);

    this.tweens.add({
      targets: text,
      y: position.y - 36,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  explosion(position: Phaser.Math.Vector2, color: number, scale = 1): void {
    const ring = this.add
      .circle(position.x, position.y, 9 * scale, color, 0.75)
      .setDepth(70);
    this.registerWorldObject(ring);

    this.tweens.add({
      targets: ring,
      radius: 25 * scale,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 6; i += 1) {
      const spark = this.add
        .rectangle(position.x, position.y, 3, 3, i % 2 === 0 ? color : 0xffe0a3, 1)
        .setDepth(75);
      this.registerWorldObject(spark);
      const angle = (Math.PI * 2 * i) / 6;
      this.tweens.add({
        targets: spark,
        x: position.x + Math.cos(angle) * 22 * scale,
        y: position.y + Math.sin(angle) * 22 * scale,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private showAreaImpact(
    position: Phaser.Math.Vector2,
    radius: number,
    color: number,
    effect: AreaExplosionType | undefined,
  ): void {
    const gridFlash = this.add.graphics().setDepth(68);
    this.registerWorldObject(gridFlash);
    gridFlash.fillStyle(color, 0.1);
    gridFlash.lineStyle(2, color, 0.62);

    const minX = Math.max(0, Math.floor((position.x - radius) / TILE_SIZE));
    const maxX = Math.min(GRID_WIDTH - 1, Math.floor((position.x + radius) / TILE_SIZE));
    const minY = Math.max(0, Math.floor((position.y - radius) / TILE_SIZE));
    const maxY = Math.min(GRID_HEIGHT - 1, Math.floor((position.y + radius) / TILE_SIZE));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const cellCenterX = MAP_ORIGIN_X + x * TILE_SIZE + TILE_SIZE / 2;
        const cellCenterY = MAP_ORIGIN_Y + y * TILE_SIZE + TILE_SIZE / 2;
        const distance = Phaser.Math.Distance.Between(
          position.x,
          position.y,
          cellCenterX,
          cellCenterY,
        );

        if (distance > radius + TILE_SIZE * 0.2) {
          continue;
        }

        gridFlash.fillRect(
          MAP_ORIGIN_X + x * TILE_SIZE + 2,
          MAP_ORIGIN_Y + y * TILE_SIZE + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4,
        );
        gridFlash.strokeRect(
          MAP_ORIGIN_X + x * TILE_SIZE + 3,
          MAP_ORIGIN_Y + y * TILE_SIZE + 3,
          TILE_SIZE - 6,
          TILE_SIZE - 6,
        );
      }
    }

    if (effect && this.textures.exists(`area-explosion-${effect}`)) {
      const size = radius * (effect === 'missile' ? 2.7 : 2.35);
      const sprite = this.add
        .sprite(position.x, position.y, `area-explosion-${effect}`)
        .setDisplaySize(size, size)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(effect === 'emp' ? 0.9 : 0.86)
        .setDepth(78);
      this.registerWorldObject(sprite);

      this.tweens.add({
        targets: sprite,
        scaleX: sprite.scaleX * 1.18,
        scaleY: sprite.scaleY * 1.18,
        alpha: 0,
        duration: effect === 'missile' ? 520 : 420,
        ease: 'Quad.easeOut',
        onComplete: () => sprite.destroy(),
      });
    } else {
      this.explosion(position, color, Math.max(0.75, radius / 80));
    }

    this.tweens.add({
      targets: gridFlash,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => gridFlash.destroy(),
    });
  }

  winGame(): void {
    this.gameEnded = true;
    this.wave.stop();
    this.saveFactoryState();
    this.showEndOverlay('CLEAR', '10ウェーブ防衛成功。工場状態を保存しました');
  }

  registerWorldObject(object: Phaser.GameObjects.GameObject): void {
    this.worldObjects.add(object);
    this.uiObjects.delete(object);
    this.uiCamera?.ignore(object);
  }

  registerUiObject(object: Phaser.GameObjects.GameObject): void {
    this.uiObjects.add(object);
    this.worldObjects.delete(object);
    this.worldCamera?.ignore(object);
  }

  private captureInitialWorldObjects(): void {
    this.children.list.forEach((object) => this.worldObjects.add(object));
  }

  private captureInitialUiObjects(): void {
    this.children.list.forEach((object) => {
      if (!this.worldObjects.has(object)) {
        this.uiObjects.add(object);
      }
    });
    this.syncCameraIgnores();
  }

  private configureCameras(): void {
    this.worldCamera = this.cameras.main;
    this.worldCamera
      .setViewport(WORLD_VIEW_X, WORLD_VIEW_Y, WORLD_VIEW_WIDTH, WORLD_VIEW_HEIGHT)
      .setZoom(0.9)
      .centerOn(TILE_SIZE * 8, MAP_HEIGHT_PX * 0.5)
      .setBackgroundColor(0x05080c);

    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.uiCamera.setScroll(0, 0).setZoom(1).setName('ui');
    this.clampWorldCamera();
  }

  private syncCameraIgnores(): void {
    this.worldCamera.ignore([...this.uiObjects]);
    this.uiCamera.ignore([...this.worldObjects]);
  }

  private replaceGeneratedTextures(): void {
    const entries: {
      key: string;
      sheet?: string;
      frame: number;
      width: number;
      height: number;
      fill?: number;
    }[] = [
      { key: 'building-core', frame: 0, width: 30, height: 30 },
      { key: 'building-miner', frame: 1, width: 30, height: 30 },
      { key: 'building-conveyor', frame: 2, width: 30, height: 30 },
      { key: 'building-ammoFactory', frame: 3, width: 30, height: 30 },
      { key: 'building-turret', frame: 4, width: 30, height: 30 },
      { key: 'building-metalPlateFactory', sheet: 'generated-building-sprites', frame: 0, width: 30, height: 30 },
      { key: 'building-wireFactory', sheet: 'generated-building-sprites', frame: 1, width: 30, height: 30 },
      { key: 'building-plasticFactory', sheet: 'generated-building-sprites', frame: 2, width: 30, height: 30 },
      { key: 'building-fuelFactory', sheet: 'generated-building-sprites', frame: 3, width: 30, height: 30 },
      { key: 'building-specialAmmoFactory', sheet: 'generated-building-sprites', frame: 4, width: 30, height: 30 },
      { key: 'building-missileFactory', sheet: 'generated-building-sprites', frame: 5, width: 30, height: 30 },
      { key: 'building-droneFactory', sheet: 'generated-building-sprites', frame: 6, width: 30, height: 30 },
      { key: 'building-sniperTurret', sheet: 'generated-building-sprites', frame: 7, width: 30, height: 30 },
      { key: 'building-cannonTurret', sheet: 'generated-building-sprites', frame: 8, width: 30, height: 30 },
      { key: 'building-empTurret', sheet: 'generated-building-sprites', frame: 9, width: 30, height: 30 },
      { key: 'building-missileTurret', sheet: 'generated-building-sprites', frame: 10, width: 30, height: 30 },
      { key: 'building-droneTower', sheet: 'generated-building-sprites', frame: 11, width: 30, height: 30 },
      { key: 'building-wall', sheet: 'generated-building-sprites', frame: 12, width: 30, height: 30 },
      { key: 'item-ore', frame: 5, width: 10, height: 10 },
      { key: 'item-ammo', frame: 6, width: 10, height: 10 },
      { key: 'enemy-small', frame: 7, width: 24, height: 24 },
      { key: 'enemy-heavy', frame: 8, width: 28, height: 28 },
      { key: 'enemy-suicide', frame: 9, width: 24, height: 24 },
      { key: 'tile-lava', frame: 10, width: TILE_SIZE, height: TILE_SIZE, fill: 0x2b1714 },
      { key: 'tile-resource', frame: 5, width: TILE_SIZE, height: TILE_SIZE, fill: 0x303436 },
      { key: 'tile-resourceCopper', sheet: 'generated-building-sprites', frame: 13, width: TILE_SIZE, height: TILE_SIZE, fill: 0x332d2a },
      { key: 'tile-resourceOil', sheet: 'generated-building-sprites', frame: 14, width: TILE_SIZE, height: TILE_SIZE, fill: 0x20232b },
      { key: 'conveyor-curveDown', sheet: 'generated-conveyors', frame: 0, width: 30, height: 30 },
      { key: 'conveyor-curveUp', sheet: 'generated-conveyors', frame: 1, width: 30, height: 30 },
      { key: 'conveyor-junctionThree', sheet: 'generated-conveyors', frame: 2, width: 30, height: 30 },
      { key: 'conveyor-junctionFour', sheet: 'generated-conveyors', frame: 4, width: 30, height: 30 },
      { key: 'conveyor-undergroundInput', sheet: 'underground-conveyors', frame: 0, width: 30, height: 30 },
      { key: 'conveyor-undergroundOutput', sheet: 'underground-conveyors', frame: 1, width: 30, height: 30 },
    ];

    for (const entry of entries) {
      const frame = this.textures.getFrame(entry.sheet ?? 'generated-sprites', entry.frame);
      const source = frame?.source.image as CanvasImageSource | undefined;

      if (!frame || !source) {
        continue;
      }

      if (this.textures.exists(entry.key)) {
        this.textures.remove(entry.key);
      }

      const texture = this.textures.createCanvas(
        entry.key,
        entry.width,
        entry.height,
      ) as Phaser.Textures.CanvasTexture | null;

      if (!texture) {
        continue;
      }

      const context = texture.context;
      context.clearRect(0, 0, entry.width, entry.height);

      if (entry.fill !== undefined) {
        context.fillStyle = `#${entry.fill.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, entry.width, entry.height);
      }

      context.imageSmoothingEnabled = false;
      context.drawImage(
        source,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        entry.width,
        entry.height,
      );
      texture.refresh();
    }
  }

  private createAreaExplosionTextures(): void {
    const source = this.textures
      .get('area-explosions-generated')
      .getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;

    if (!source?.width || !source.height) {
      return;
    }

    const frameKeys: AreaExplosionType[] = ['incendiary', 'emp', 'missile'];
    const sliceWidth = source.width / frameKeys.length;

    frameKeys.forEach((effect, index) => {
      const key = `area-explosion-${effect}`;
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }

      const texture = this.textures.createCanvas(key, 128, 128) as
        | Phaser.Textures.CanvasTexture
        | null;
      if (!texture) {
        return;
      }

      const context = texture.context;
      context.clearRect(0, 0, 128, 128);
      context.imageSmoothingEnabled = false;
      context.drawImage(
        source,
        index * sliceWidth,
        0,
        sliceWidth,
        source.height,
        0,
        0,
        128,
        128,
      );
      texture.refresh();
    });
  }

  private createBackdrop(): void {
    this.add.rectangle(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX, 0x061019, 1).setOrigin(0);
    this.add
      .rectangle(
        MAP_ORIGIN_X - 6,
        MAP_ORIGIN_Y - 6,
        GRID_WIDTH * TILE_SIZE + 12,
        GRID_HEIGHT * TILE_SIZE + 12,
        0x0a0d10,
        1,
      )
      .setOrigin(0)
      .setStrokeStyle(2, 0x6f5944, 1);
  }

  private createFactoryFromSaveOrStarterBase(): void {
    if (this.restoreSavedFactoryState()) {
      return;
    }

    this.createStarterBase();
  }

  private createStarterBase(): void {
    this.core = this.factory.createBuilding('core', { x: 4, y: 11 }, 'up');
    this.factory.createBuilding('miner', { x: 2, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 3, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 4, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 5, y: 9 }, 'right');
    const ammoFactory = this.factory.createBuilding('ammoFactory', { x: 6, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 7, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 8, y: 9 }, 'right');
    this.factory.createBuilding('conveyor', { x: 9, y: 9 }, 'down');
    this.factory.createBuilding('conveyor', { x: 9, y: 10 }, 'down');
    this.factory.createBuilding('conveyor', { x: 9, y: 11 }, 'right');
    this.factory.createBuilding('conveyor', { x: 10, y: 11 }, 'right');
    const turret = this.factory.createBuilding('turret', { x: 11, y: 11 }, 'right');

    ammoFactory.oreStored = 2;
    turret.ammoStored = 8;
  }

  private restoreSavedFactoryState(): boolean {
    const saved = this.loadSavedFactoryState();
    if (!saved) {
      return false;
    }

    const coreState = saved.buildings.find((building) => building.type === 'core');
    if (!coreState) {
      return false;
    }

    const restored: { building: Building; state: SavedBuildingState }[] = [];
    for (const state of saved.buildings) {
      if (!this.isValidSavedBuilding(state)) {
        continue;
      }

      const building = this.factory.createBuilding(
        state.type,
        state.cell,
        state.direction,
        state.conveyorVariant,
      );
      restored.push({ building, state });
      if (state.type === 'core') {
        this.core = building;
      }
    }

    if (!this.core) {
      return false;
    }

    for (const { building, state } of restored) {
      building.setDirection(state.direction);
      building.setConveyorVariant(state.conveyorVariant);
      this.applySavedBuildingState(building, state);
      this.factory.refreshAutoConveyorsAround(building.cell);
    }

    this.setStatus('前回の工場状態を引き継ぎました', 3200);
    return true;
  }

  private loadSavedFactoryState(): SavedFactoryState | null {
    try {
      const raw = window.localStorage.getItem(FACTORY_SAVE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<SavedFactoryState>;
      if (parsed.version !== 1 || !Array.isArray(parsed.buildings)) {
        return null;
      }

      return {
        version: 1,
        buildings: parsed.buildings.filter((building) =>
          this.isValidSavedBuilding(building),
        ),
      };
    } catch {
      return null;
    }
  }

  private saveFactoryState(): void {
    try {
      const state: SavedFactoryState = {
        version: 1,
        buildings: this.grid.allBuildings().map((building) =>
          this.serializeBuildingState(building),
        ),
      };
      window.localStorage.setItem(FACTORY_SAVE_KEY, JSON.stringify(state));
    } catch {
      this.setStatus('工場状態の保存に失敗しました');
    }
  }

  private serializeBuildingState(building: Building): SavedBuildingState {
    const storage: Partial<Record<ItemType, number>> = {};
    for (const item of building.storedItems()) {
      storage[item] = building.stored(item);
    }

    return {
      type: building.type,
      cell: { ...building.cell },
      direction: building.direction,
      conveyorVariant: building.conveyorVariant,
      hp: building.type === 'core' ? building.maxHp : building.hp,
      alive: building.type === 'core' ? true : building.alive,
      item: building.item,
      storage,
    };
  }

  private applySavedBuildingState(
    building: Building,
    state: SavedBuildingState,
  ): void {
    if (building.type === 'core') {
      building.repairFull();
    } else if (!state.alive || state.hp <= 0) {
      building.damage(building.maxHp);
    } else if (state.hp < building.maxHp) {
      building.damage(building.maxHp - state.hp);
    }

    if (building.alive) {
      building.setItem(state.item);
      for (const [item, amount] of Object.entries(state.storage)) {
        if (this.isItemType(item) && typeof amount === 'number') {
          building.setStored(item, amount);
        }
      }
    }
  }

  private isValidSavedBuilding(
    value: unknown,
  ): value is SavedBuildingState {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const state = value as Partial<SavedBuildingState>;
    return (
      this.isBuildingType(state.type) &&
      this.isCell(state.cell) &&
      this.isDirection(state.direction) &&
      this.isConveyorVariant(state.conveyorVariant) &&
      typeof state.hp === 'number' &&
      typeof state.alive === 'boolean' &&
      (state.item === null || this.isItemType(state.item)) &&
      Boolean(state.storage) &&
      typeof state.storage === 'object'
    );
  }

  private isCell(value: unknown): value is Cell {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const cell = value as Partial<Cell>;
    const x = cell.x;
    const y = cell.y;
    return (
      typeof x === 'number' &&
      typeof y === 'number' &&
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      this.grid.inBounds({ x, y })
    );
  }

  private isBuildingType(value: unknown): value is BuildingType {
    return typeof value === 'string' && value in BUILDING_DEFS;
  }

  private isDirection(value: unknown): value is Direction {
    return typeof value === 'string' && value in DIRECTION_ANGLES;
  }

  private isConveyorVariant(value: unknown): value is ConveyorVariant {
    return typeof value === 'string' && value in CONVEYOR_DEFS;
  }

  private isItemType(value: unknown): value is ItemType {
    return typeof value === 'string' && value in ITEM_DEFS;
  }

  private createPools(): void {
    for (let i = 0; i < 72; i += 1) {
      this.enemies.push(new Enemy(this));
    }

    for (let i = 0; i < 96; i += 1) {
      this.bullets.push(new Bullet(this));
    }

    for (let i = 0; i < 18; i += 1) {
      this.drones.push(new CombatDrone(this));
    }
  }

  private createInput(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.resumeAudio();

      if (this.gameEnded || this.wave.state === 'upgrade') {
        return;
      }

      if (pointer.rightButtonDown()) {
        this.startPan(pointer);
        return;
      }

      if (this.spacePanning) {
        this.startPan(pointer);
        return;
      }

      if (pointer.leftButtonDown()) {
        if (!this.isPointerInWorldView(pointer)) {
          return;
        }

        if (this.mode === 'move') {
          this.tryMoveBuilding(pointer);
        } else if (this.mode === 'demolish') {
          this.isDemolishDragging = true;
          this.lastDemolishCell = null;
          this.tryDemolish(pointer);
        } else {
          if (this.selectedBuild === 'conveyor') {
            this.isConveyorPainting = true;
            this.lastConveyorPaintCell = null;
          }
          this.tryPlace(pointer);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.panToPointer(pointer);
        return;
      }

      if (
        this.isConveyorPainting &&
        pointer.leftButtonDown() &&
        this.mode === 'build' &&
        this.selectedBuild === 'conveyor'
      ) {
        this.tryPlace(pointer, true);
      }

      if (
        this.isDemolishDragging &&
        pointer.leftButtonDown() &&
        this.mode === 'demolish'
      ) {
        this.tryDemolish(pointer, true);
      }
    });

    this.input.on('pointerup', () => {
      this.stopPan();
      this.stopConveyorPainting();
      this.stopDemolishing();
    });
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      if (this.isPointerInWorldView(pointer)) {
        this.zoomAtPointer(pointer, dy);
      }
    });

    this.keys.w = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keys.a = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys.s = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keys.d = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keys.up = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keys.left = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keys.down = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keys.right = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keys.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        this.spacePanning = true;
        return;
      }

      if (event.key.toLowerCase() === 'r') {
        if (this.mode === 'build' && this.tryRotateHoveredBuilding()) {
          return;
        }

        this.direction = rotateDirection(this.direction);
        this.setStatus(`向き: ${this.directionLabel(this.direction)}`, 900);
      }

      if (event.key.toLowerCase() === 'q') {
        this.cycleMode();
      }

      if (event.key.toLowerCase() === 'm') {
        this.setMode(this.mode === 'move' ? 'build' : 'move');
      }

      if (event.key.toLowerCase() === 'x') {
        this.setMode(this.mode === 'demolish' ? 'build' : 'demolish');
      }

      const number = Number(event.key);
      if (number >= 1 && number <= BUILD_OPTIONS.length) {
        this.selectBuildOption(BUILD_OPTIONS[number - 1]);
      }
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      this.spacePanning = false;
      this.stopPan();
    });
  }

  private createHitEvents(): void {
    this.events.on('bullet-hit', (x: number, y: number, color = 0xffd873) => {
      const flash = this.add.circle(x, y, 5, color, 0.9).setDepth(65);
      this.registerWorldObject(flash);
      this.tweens.add({
        targets: flash,
        scale: 1.9,
        alpha: 0,
        duration: 130,
        onComplete: () => flash.destroy(),
      });
    });
  }

  private updateCameraControls(delta: number): void {
    const speed = (420 * delta) / 1000 / this.worldCamera.zoom;
    let dx = 0;
    let dy = 0;

    if (this.keys.a?.isDown || this.keys.left?.isDown) {
      dx -= speed;
    }

    if (this.keys.d?.isDown || this.keys.right?.isDown) {
      dx += speed;
    }

    if (this.keys.w?.isDown || this.keys.up?.isDown) {
      dy -= speed;
    }

    if (this.keys.s?.isDown || this.keys.down?.isDown) {
      dy += speed;
    }

    if (dx !== 0 || dy !== 0) {
      this.worldCamera.scrollX += dx;
      this.worldCamera.scrollY += dy;
      this.clampWorldCamera();
    }
  }

  private startPan(pointer: Phaser.Input.Pointer): void {
    this.isPanning = true;
    this.lastPanPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.setStatus('ドラッグ移動', 900);
  }

  private panToPointer(pointer: Phaser.Input.Pointer): void {
    if (!this.lastPanPoint) {
      this.startPan(pointer);
      return;
    }

    const dx = pointer.x - this.lastPanPoint.x;
    const dy = pointer.y - this.lastPanPoint.y;
    this.worldCamera.scrollX -= dx / this.worldCamera.zoom;
    this.worldCamera.scrollY -= dy / this.worldCamera.zoom;
    this.lastPanPoint.set(pointer.x, pointer.y);
    this.clampWorldCamera();
  }

  private stopPan(): void {
    this.isPanning = false;
    this.lastPanPoint = null;
  }

  private stopConveyorPainting(): void {
    this.isConveyorPainting = false;
    this.lastConveyorPaintCell = null;
  }

  private stopDemolishing(): void {
    this.isDemolishDragging = false;
    this.lastDemolishCell = null;
  }

  private zoomAtPointer(pointer: Phaser.Input.Pointer, wheelDeltaY: number): void {
    const before = this.screenToWorld(pointer);
    const zoomDelta = wheelDeltaY > 0 ? -0.1 : 0.1;
    this.worldCamera.setZoom(
      Phaser.Math.Clamp(this.worldCamera.zoom + zoomDelta, 0.5, 2),
    );
    const after = this.screenToWorld(pointer);
    this.worldCamera.scrollX += before.x - after.x;
    this.worldCamera.scrollY += before.y - after.y;
    this.clampWorldCamera();
  }

  private clampWorldCamera(): void {
    this.worldCamera.scrollX = this.clampScrollAxis(
      this.worldCamera.scrollX,
      this.worldCamera.width,
      MAP_WIDTH_PX,
    );
    this.worldCamera.scrollY = this.clampScrollAxis(
      this.worldCamera.scrollY,
      this.worldCamera.height,
      MAP_HEIGHT_PX,
    );
  }

  private clampScrollAxis(scroll: number, viewportSize: number, mapSize: number): number {
    const visibleSize = viewportSize / this.worldCamera.zoom;
    const halfViewport = viewportSize * 0.5;

    if (visibleSize >= mapSize) {
      return mapSize * 0.5 - halfViewport;
    }

    const minScroll = visibleSize * 0.5 - halfViewport;
    const maxScroll = mapSize - halfViewport - visibleSize * 0.5;

    return Phaser.Math.Clamp(scroll, minScroll, maxScroll);
  }

  private isPointerInWorldView(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.x >= this.worldCamera.x &&
      pointer.x <= this.worldCamera.x + this.worldCamera.width &&
      pointer.y >= this.worldCamera.y &&
      pointer.y <= this.worldCamera.y + this.worldCamera.height
    );
  }

  private pointerToCell(pointer: Phaser.Input.Pointer): Cell | null {
    if (!this.isPointerInWorldView(pointer)) {
      return null;
    }

    const worldPoint = this.screenToWorld(pointer);
    return this.grid.worldToCell(worldPoint.x, worldPoint.y);
  }

  private screenToWorld(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const visibleLeft = this.worldCamera.scrollX +
      this.worldCamera.width * 0.5 -
      (this.worldCamera.width / this.worldCamera.zoom) * 0.5;
    const visibleTop = this.worldCamera.scrollY +
      this.worldCamera.height * 0.5 -
      (this.worldCamera.height / this.worldCamera.zoom) * 0.5;

    return new Phaser.Math.Vector2(
      visibleLeft + (pointer.x - this.worldCamera.x) / this.worldCamera.zoom,
      visibleTop + (pointer.y - this.worldCamera.y) / this.worldCamera.zoom,
    );
  }

  private createUi(): void {
    const lowerPanelY = WORLD_VIEW_Y + WORLD_VIEW_HEIGHT + 8;

    this.drawPanel(8, 8, 224, 242, '防衛状況');
    const readyButton = this.add
      .rectangle(118, 232, 178, 34, 0x1f4c3a, 1)
      .setStrokeStyle(2, 0x79f0a4, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const readyText = this.add
      .text(118, 232, '準備完了', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    readyButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.resumeAudio();
        if (this.wave.state === 'preparation') {
          this.wave.startCombat();
        }
      },
    );

    const repairButton = this.add
      .rectangle(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 260, lowerPanelY + 35, 148, 28, 0x26303a, 1)
      .setStrokeStyle(2, 0xffd16a, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const repairText = this.add
      .text(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 260, lowerPanelY + 35, '一括修理', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    repairButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.resumeAudio();
        this.repairAllBuildings();
      },
    );

    const recipeButton = this.add
      .rectangle(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 260, lowerPanelY + 70, 148, 28, 0x223242, 1)
      .setStrokeStyle(2, 0x7ddcff, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const recipeText = this.add
      .text(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 260, lowerPanelY + 70, 'レシピ一覧', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    recipeButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.resumeAudio();
        this.toggleRecipeOverlay();
      },
    );

    const moveButton = this.add
      .rectangle(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 102, lowerPanelY + 35, 148, 28, 0x22343c, 1)
      .setStrokeStyle(2, 0x78f2d6, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const moveText = this.add
      .text(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 102, lowerPanelY + 35, '移設モード', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    moveButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.resumeAudio();
        this.setMode(this.mode === 'move' ? 'build' : 'move');
      },
    );

    const demolishButton = this.add
      .rectangle(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 102, lowerPanelY + 70, 148, 28, 0x3a2a24, 1)
      .setStrokeStyle(2, 0xffa35c, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const demolishText = this.add
      .text(WORLD_VIEW_X + WORLD_VIEW_WIDTH - 102, lowerPanelY + 70, '解体モード', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    demolishButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.resumeAudio();
        this.setMode(this.mode === 'demolish' ? 'build' : 'demolish');
      },
    );

    const selectedText = this.addText(WORLD_VIEW_X + 26, lowerPanelY + 50, '', 14, '#e6eef4');
    selectedText.setWordWrapWidth(WORLD_VIEW_WIDTH - 340);
    selectedText.setLineSpacing(1);
    const statusText = this.addText(WORLD_VIEW_X + 26, lowerPanelY + 88, this.statusMessage, 12, '#fff0c4');
    statusText.setWordWrapWidth(WORLD_VIEW_WIDTH - 340);
    statusText.setLineSpacing(0);

    this.ui = {
      wave: this.addText(24, 36, '', 21, '#fff3cc', true),
      stage: this.addText(24, 66, '', 13, '#c8f3d6', true),
      phase: this.addText(24, 88, '', 16, '#e6eef4'),
      core: this.addText(24, 116, '', 18, '#7fdcff'),
      parts: this.addText(24, 146, '', 17, '#d6e3eb'),
      ore: this.addText(24, 174, '', 15, '#d6e3eb'),
      ammo: this.addText(24, 200, '', 13, '#ffb174'),
      selected: selectedText,
      status: statusText,
      readyButton,
      readyText,
      repairButton,
      repairText,
      recipeButton,
      recipeText,
      moveButton,
      moveText,
      demolishButton,
      demolishText,
    };

    this.drawPanel(8, 260, 224, 500, '建設メニュー');
    this.createBuildMenu();

    this.drawPanel(WORLD_VIEW_X, lowerPanelY, WORLD_VIEW_WIDTH, 102, '操作ライン');
    this.updateUi(this.time.now);
  }

  private createBuildMenu(): void {
    this.clearBuildMenu();
    let yCursor = BUILD_MENU_START_Y;

    for (const group of BUILD_GROUPS) {
      const y = yCursor;
      const expanded = this.expandedBuildGroups.has(group.id);
      const unlockedCount = group.optionIds.filter((optionId) => {
        const option = BUILD_OPTION_BY_ID.get(optionId);
        return option ? this.isBuildOptionUnlocked(option) : false;
      }).length;
      const headerBox = this.trackBuildMenuObject(
          this.add
          .rectangle(118, y, 198, BUILD_MENU_HEADER_HEIGHT, 0x202a33, 1)
          .setOrigin(0.5)
          .setStrokeStyle(2, expanded ? 0xffd16a : 0x56616b, 1)
          .setDepth(100)
          .setInteractive({ useHandCursor: true }),
      );
      this.trackBuildMenuObject(
        this.sharpenBuildMenuText(
          this.addText(26, y - 11, `${expanded ? '-' : '+'} ${group.label}`, 15, '#fff3cc', true),
          true,
        ),
      );
      this.trackBuildMenuObject(
        this.sharpenBuildMenuText(
          this.addText(184, y - 9, `${unlockedCount}/${group.optionIds.length}`, 12, '#9fb3c3', true),
        ),
      );

      headerBox.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.resumeAudio();
          this.toggleBuildGroup(group.id);
        },
      );
      headerBox.on('pointerover', () => headerBox.setFillStyle(0x2a3640, 1));
      headerBox.on('pointerout', () => headerBox.setFillStyle(0x202a33, 1));
      yCursor += BUILD_MENU_HEADER_HEIGHT + BUILD_MENU_GAP;

      if (!expanded) {
        continue;
      }

      group.optionIds.forEach((optionId, index) => {
        const option = BUILD_OPTION_BY_ID.get(optionId);
        if (!option) {
          return;
        }

        const column = index % BUILD_MENU_CARD_COLUMNS.length;
        const optionY =
          yCursor +
          Math.floor(index / BUILD_MENU_CARD_COLUMNS.length) *
            (BUILD_MENU_CARD_HEIGHT + BUILD_MENU_GAP) +
          BUILD_MENU_CARD_HEIGHT / 2;
        const optionX = BUILD_MENU_CARD_COLUMNS[column];
        const cost = this.buildOptionCost(option);
        const unlocked = this.isBuildOptionUnlocked(option);
        const box = this.trackBuildMenuObject(
          this.add
            .rectangle(
              optionX,
              optionY,
              BUILD_MENU_CARD_WIDTH,
              BUILD_MENU_CARD_HEIGHT,
              unlocked ? 0x151a20 : 0x11161c,
              1,
            )
            .setOrigin(0.5)
            .setStrokeStyle(
              2,
              unlocked
                ? this.isBuildOptionSelected(option)
                  ? 0xffd16a
                  : 0x55606a
                : 0x3f4750,
              1,
            )
            .setDepth(100)
            .setInteractive({ useHandCursor: true }),
        );
        const icon = this.trackBuildMenuObject(
          this.add
            .sprite(optionX, optionY - 18, option.iconKey)
            .setDisplaySize(30, 30)
            .setDepth(101),
        );
        icon.setAlpha(unlocked ? 1 : 0.3);
        const labelSize = option.label.length >= 7 ? 9 : option.label.length >= 6 ? 10 : 11;
        const labelText = this.add
          .text(optionX, optionY + 1, option.label, {
            fontFamily: '"Yu Gothic", Meiryo, sans-serif',
            fontSize: `${labelSize}px`,
            color: unlocked ? '#f4f0df' : '#798691',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#05070a',
            strokeThickness: 1,
            wordWrap: { width: BUILD_MENU_CARD_WIDTH - 8 },
          })
          .setOrigin(0.5, 0)
          .setDepth(101);
        this.sharpenBuildMenuText(labelText, true);
        const costText = this.add
          .text(optionX, optionY + 22, `建材 ${cost}`, {
            fontFamily: '"Yu Gothic", Meiryo, sans-serif',
            fontSize: '12px',
            color: unlocked ? '#ffd16a' : '#9fb3c3',
            fontStyle: 'bold',
            stroke: '#05070a',
            strokeThickness: 1,
          })
          .setOrigin(0.5, 0)
          .setDepth(101);
        costText.setText(unlocked ? `建材 ${cost}` : this.buildUnlockLabel(option));
        this.sharpenBuildMenuText(costText, true);
        this.trackBuildMenuObject(labelText);
        this.trackBuildMenuObject(costText);

        box.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            event.stopPropagation();
            this.resumeAudio();
            this.selectBuildOption(option);
          },
        );
        box.on('pointerover', () => box.setFillStyle(unlocked ? 0x22303a : 0x18202a, 1));
        box.on('pointerout', () => box.setFillStyle(unlocked ? 0x151a20 : 0x11161c, 1));

        this.buildButtons.push({ option, box });
      });

      yCursor +=
        Math.ceil(group.optionIds.length / BUILD_MENU_CARD_COLUMNS.length) *
          (BUILD_MENU_CARD_HEIGHT + BUILD_MENU_GAP) +
        BUILD_MENU_AFTER_EXPANDED_GAP;
    }
  }

  private trackBuildMenuObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.buildMenuObjects.push(object);
    this.registerUiObject(object);
    return object;
  }

  private sharpenBuildMenuText(
    text: Phaser.GameObjects.Text,
    withShadow = false,
  ): Phaser.GameObjects.Text {
    text.setResolution(BUILD_MENU_TEXT_RESOLUTION);
    if (withShadow) {
      text.setShadow(1, 1, '#000000', 0, false, true);
    }
    return text;
  }

  private clearBuildMenu(): void {
    this.buildButtons = [];
    for (const object of this.buildMenuObjects.splice(0)) {
      this.uiObjects.delete(object);
      this.worldObjects.delete(object);
      object.destroy();
    }
  }

  private toggleBuildGroup(groupId: BuildGroupId): void {
    if (this.expandedBuildGroups.has(groupId)) {
      this.expandedBuildGroups.delete(groupId);
    } else {
      this.expandedBuildGroups.clear();
      this.expandedBuildGroups.add(groupId);
    }

    this.createBuildMenu();
  }

  private currentStage(): StageDefinition {
    return (
      [...STAGE_DEFS]
        .reverse()
        .find((stage) => this.wave.wave >= stage.unlockWave) ?? STAGE_DEFS[0]
    );
  }

  private stageForUnlockWave(unlockWave: number): StageDefinition {
    return (
      STAGE_DEFS.find((stage) => stage.unlockWave === unlockWave) ??
      [...STAGE_DEFS]
        .reverse()
        .find((stage) => unlockWave >= stage.unlockWave) ??
      STAGE_DEFS[0]
    );
  }

  private unlockWaveForOption(option: BuildOption): number {
    return BUILD_OPTION_UNLOCK_WAVES[option.id] ?? 0;
  }

  private isBuildOptionUnlocked(option: BuildOption): boolean {
    return this.wave.wave >= this.unlockWaveForOption(option);
  }

  private buildUnlockLabel(option: BuildOption): string {
    return `S${this.stageForUnlockWave(this.unlockWaveForOption(option)).id}解除`;
  }

  private lockedBuildStatus(option: BuildOption): string {
    const unlockWave = this.unlockWaveForOption(option);
    const stage = this.stageForUnlockWave(unlockWave);
    return `${option.label}は${stage.label}で解禁（ウェーブ${unlockWave}クリア後）`;
  }

  private selectedBuildOption(): BuildOption | undefined {
    return BUILD_OPTIONS.find(
      (option) =>
        option.type === this.selectedBuild &&
        (option.conveyorVariant ?? 'straight') === this.selectedConveyorVariant,
    );
  }

  private isSelectedBuildUnlocked(): boolean {
    const option = this.selectedBuildOption();
    return !option || this.isBuildOptionUnlocked(option);
  }

  private updateTurrets(time: number): void {
    const turrets = this.factory
      .getBuildings()
      .filter((building): building is Building & { type: WeaponBuildingType } =>
        this.isWeaponBuilding(building.type),
      );

    for (const turret of turrets) {
      const config = WEAPON_CONFIGS[turret.type];
      if (
        !turret.alive ||
        turret.stored(config.ammo) <= 0 ||
        time < turret.nextFireAt
      ) {
        continue;
      }

      const turretPosition = turret.getWorldPosition();
      const rangeCenter = this.turretRangeCenter(
        turretPosition.x,
        turretPosition.y,
        turret.direction,
      );
      const target = this.findNearestEnemy(rangeCenter, this.weaponRange(turret.type));

      if (!target) {
        continue;
      }

      turret.nextFireAt = time + 560 * config.fireIntervalMultiplier;
      if (Math.random() >= this.modifiers.ammoSaveChance) {
        turret.removeStored(config.ammo);
      }
      turret.flash(0xffe0a3);
      this.playWeaponShotSound(turret.type);
      const bullet = this.bullets.find((candidate) => !candidate.active) ?? this.addBullet();
      const position = turret.getWorldPosition();
      const damage =
        this.modifiers.turretDamage *
        config.damageMultiplier *
        this.weaponDamageMultiplier(turret.type);
      bullet.fire(
        position.x,
        position.y,
        target,
        damage,
        config.color,
        config.radius || config.stunMs
          ? (_target, hitPosition) => {
              this.affectEnemiesArea(
                hitPosition,
                config.radius ?? 20,
                damage,
                config.stunMs ?? 0,
                config.color,
                config.areaEffect,
              );
            }
          : null,
      );
    }
  }

  private updateDroneTowers(time: number): void {
    for (const tower of this.factory.getBuildings('droneTower')) {
      if (
        !tower.alive ||
        tower.stored('drone') <= 0 ||
        time < tower.nextFireAt ||
        !this.hasActiveEnemies()
      ) {
        continue;
      }

      const drone = this.drones.find((candidate) => !candidate.active);
      if (!drone) {
        continue;
      }

      tower.removeStored('drone');
      tower.nextFireAt = time + 2600;
      tower.flash(0x9de8ff);
      const position = tower.getWorldPosition();
      drone.launch(position.x, position.y);
      this.playWeaponShotSound('droneTower');
      this.floatText(position, 'ドローン発進', 0x9de8ff);
    }
  }

  private updateDrones(time: number, delta: number): void {
    for (const drone of this.drones) {
      drone.update(
        time,
        delta,
        this.findNearestEnemy(drone.getWorldPosition(), Number.POSITIVE_INFINITY),
        (x, y, target) => {
          const bullet = this.bullets.find((candidate) => !candidate.active) ?? this.addBullet();
          this.playWeaponShotSound('combatDrone');
          bullet.fire(
            x,
            y,
            target,
            this.modifiers.turretDamage * 0.45 * this.modifiers.droneDamageMultiplier,
            0x9de8ff,
          );
        },
      );
    }
  }

  private affectEnemiesArea(
    position: Phaser.Math.Vector2,
    radius: number,
    damage: number,
    stunMs: number,
    color: number,
    effect: AreaExplosionType | undefined,
  ): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }

      const enemyPosition = enemy.getWorldPosition();
      if (Phaser.Math.Distance.Between(position.x, position.y, enemyPosition.x, enemyPosition.y) > radius) {
        continue;
      }

      if (damage > 0) {
        enemy.damage(damage);
      }

      if (stunMs > 0) {
        enemy.stun(stunMs);
      }
    }

    this.showAreaImpact(position, radius, color, effect);
  }

  private findNearestEnemy(
    from: Phaser.Math.Vector2,
    range: number,
  ): Enemy | null {
    let best: Enemy | null = null;
    let bestDistance = range;

    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }

      const position = enemy.getWorldPosition();
      const distance = Phaser.Math.Distance.Between(from.x, from.y, position.x, position.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }

    return best;
  }

  private tryPlace(pointer: Phaser.Input.Pointer, continuous = false): boolean {
    if (this.wave.state !== 'preparation') {
      if (!continuous) {
        this.setStatus('戦闘中は準備できません');
      }
      return false;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return false;
    }

    if (!this.isSelectedBuildUnlocked()) {
      if (!continuous) {
        const option = this.selectedBuildOption();
        this.setStatus(option ? this.lockedBuildStatus(option) : 'まだ建設できません');
      }
      return false;
    }

    if (
      continuous &&
      this.selectedBuild === 'conveyor' &&
      this.lastConveyorPaintCell &&
      sameCell(this.lastConveyorPaintCell, cell)
    ) {
      return false;
    }

    const dragOutputDirection = this.conveyorDragOutputDirection(cell, continuous);
    const placementDirection = dragOutputDirection ?? this.direction;

    const existing = this.grid.getBuilding(cell);
    if (existing?.alive && existing.type === 'core') {
      if (!continuous) {
        this.setStatus('コアは上書きできません');
      }
      return false;
    }

    if (
      continuous &&
      existing?.alive &&
      existing.type === this.selectedBuild &&
      existing.direction === placementDirection &&
      (existing.type !== 'conveyor' ||
        existing.conveyorVariant === this.selectedConveyorVariant)
    ) {
      if (dragOutputDirection) {
        this.updateLastPaintedConveyorOutput(dragOutputDirection);
      }
      this.lastConveyorPaintCell = { ...cell };
      return false;
    }

    if (!this.grid.isBuildable(cell)) {
      if (!continuous) {
        this.setStatus('そこには建設できません');
      }
      return false;
    }

    if (this.selectedBuild === 'miner' && !this.grid.getResource(cell)) {
      if (!continuous) {
        this.setStatus('採掘機は鉄/銅/原油ノードに設置');
      }
      return false;
    }

    const cost = this.buildCost(this.selectedBuild, this.selectedConveyorVariant);
    const refund =
      existing?.alive && existing.type !== 'core'
        ? this.buildCost(existing.type, existing.conveyorVariant)
        : 0;

    if (this.parts + refund < cost) {
      if (!continuous) {
        this.setStatus('建材が不足');
      }
      return false;
    }

    const replacedLabel = existing?.alive ? BUILDING_DEFS[existing.type].label : '';
    if (existing) {
      this.parts += refund;
      this.factory.removeBuilding(existing);
    }

    if (dragOutputDirection) {
      this.updateLastPaintedConveyorOutput(dragOutputDirection);
    }

    this.parts -= cost;
    const building = this.factory.createBuilding(
      this.selectedBuild,
      cell,
      placementDirection,
      this.selectedBuild === 'conveyor' ? this.selectedConveyorVariant : 'straight',
    );
    const shape =
      this.selectedBuild === 'conveyor'
        ? `（${CONVEYOR_DEFS[building.conveyorVariant].label}）`
        : '';
    this.playBuildSound(this.selectedBuild);

    if (this.selectedBuild === 'conveyor') {
      this.lastConveyorPaintCell = { ...cell };
    }

    if (!continuous) {
      const builtLabel = `${BUILDING_DEFS[this.selectedBuild].label}${shape}`;
      this.setStatus(
        refund > 0
          ? `${replacedLabel}を解体して${builtLabel}を建設（建材${refund}還元）`
          : `${builtLabel}を建設`,
      );
    }

    return true;
  }

  private conveyorDragOutputDirection(cell: Cell, continuous: boolean): Direction | null {
    if (
      !continuous ||
      this.selectedBuild !== 'conveyor' ||
      this.selectedConveyorVariant !== 'straight' ||
      !this.lastConveyorPaintCell
    ) {
      return null;
    }

    return this.directionBetweenCells(this.lastConveyorPaintCell, cell);
  }

  private updateLastPaintedConveyorOutput(direction: Direction): void {
    if (!this.lastConveyorPaintCell) {
      return;
    }

    const previous = this.grid.getBuilding(this.lastConveyorPaintCell);
    if (!previous?.alive || previous.type !== 'conveyor') {
      return;
    }

    this.factory.setAutoConveyorOutput(previous, direction);
  }

  private directionBetweenCells(from: Cell, to: Cell): Direction | null {
    if (to.x === from.x && to.y < from.y) {
      return 'up';
    }
    if (to.x > from.x && to.y === from.y) {
      return 'right';
    }
    if (to.x === from.x && to.y > from.y) {
      return 'down';
    }
    if (to.x < from.x && to.y === from.y) {
      return 'left';
    }
    return null;
  }

  private tryRotateHoveredBuilding(): boolean {
    const pointer = this.input.activePointer;
    if (!this.isPointerInWorldView(pointer)) {
      return false;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return false;
    }

    const building = this.grid.getBuilding(cell);
    if (!building?.alive) {
      return false;
    }

    if (this.wave.state !== 'preparation') {
      this.setStatus('戦闘中は向きを変更できません');
      return true;
    }

    if (building.type === 'core') {
      this.setStatus('コアの向きは変更できません');
      return true;
    }

    building.setDirection(rotateDirection(building.direction));
    this.factory.refreshAutoConveyorsAround(building.cell);
    this.direction = building.direction;
    this.setStatus(`${BUILDING_DEFS[building.type].label}の向き: ${this.directionLabel(building.direction)}`);
    return true;
  }

  private tryMoveBuilding(pointer: Phaser.Input.Pointer): void {
    if (this.wave.state !== 'preparation') {
      this.setStatus('戦闘中は移設できません');
      return;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return;
    }

    if (!this.movingBuilding) {
      const building = this.grid.getBuilding(cell);
      if (!building?.alive) {
        this.setStatus('移設する施設をクリック');
        return;
      }

      this.movingBuilding = building;
      this.setStatus(`${BUILDING_DEFS[building.type].label}の移設先を選択`);
      return;
    }

    const building = this.movingBuilding;
    if (sameCell(building.cell, cell)) {
      this.movingBuilding = null;
      this.setStatus('移設をキャンセル');
      return;
    }

    if (!this.grid.isBuildable(cell)) {
      this.setStatus('そこへは移設できません');
      return;
    }

    if (building.type === 'miner' && !this.grid.getResource(cell)) {
      this.setStatus('採掘機は資源ノードへ移設');
      return;
    }

    const existing = this.grid.getBuilding(cell);
    if (existing?.alive) {
      this.setStatus('移設先に施設があります');
      return;
    }

    if (existing && !existing.alive) {
      this.factory.removeBuilding(existing);
    }

    this.factory.moveBuilding(building, cell);
    this.movingBuilding = null;
    this.setStatus(`${BUILDING_DEFS[building.type].label}を移設`);
  }

  private tryDemolish(pointer: Phaser.Input.Pointer, continuous = false): boolean {
    if (this.wave.state !== 'preparation') {
      if (!continuous) {
        this.setStatus('戦闘中は解体できません');
      }
      return false;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return false;
    }

    if (continuous && this.lastDemolishCell && sameCell(this.lastDemolishCell, cell)) {
      return false;
    }

    const cells = this.lastDemolishCell
      ? this.cellsBetween(this.lastDemolishCell, cell).slice(1)
      : [cell];
    this.lastDemolishCell = { ...cell };

    let demolished = false;
    for (const targetCell of cells) {
      demolished = this.demolishCell(targetCell, continuous) || demolished;
    }

    return demolished;
  }

  private demolishCell(cell: Cell, continuous: boolean): boolean {
    const building = this.grid.getBuilding(cell);
    if (!building?.alive || building.type === 'core') {
      if (!continuous) {
        this.setStatus('解体する施設をクリック');
      }
      return false;
    }

    const refund = this.buildCost(building.type, building.conveyorVariant);
    const position = building.getWorldPosition();
    this.parts += refund;
    this.factory.removeBuilding(building);
    this.floatText(position, `+${refund}`, 0xffd27a);
    if (!continuous) {
      this.setStatus(`${BUILDING_DEFS[building.type].label}を解体`);
    }
    return true;
  }

  private cellsBetween(from: Cell, to: Cell): Cell[] {
    const cells: Cell[] = [];
    let x = from.x;
    let y = from.y;
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const stepX = from.x < to.x ? 1 : -1;
    const stepY = from.y < to.y ? 1 : -1;
    let error = dx - dy;

    while (true) {
      cells.push({ x, y });
      if (x === to.x && y === to.y) {
        break;
      }

      const doubledError = error * 2;
      if (doubledError > -dy) {
        error -= dy;
        x += stepX;
      }
      if (doubledError < dx) {
        error += dx;
        y += stepY;
      }
    }

    return cells;
  }

  private repairAllBuildings(): void {
    if (this.wave.state !== 'preparation') {
      this.setStatus('一括修理は準備フェーズのみ使用可能');
      return;
    }

    const repairTargets = this.grid
      .allBuildings()
      .filter((building) => this.needsRepair(building));
    const totalCost = repairTargets.reduce(
      (total, building) => total + this.repairCostFor(building),
      0,
    );

    if (repairTargets.length <= 0) {
      this.setStatus('修理が必要な施設はありません');
      return;
    }

    if (this.parts < totalCost) {
      this.setStatus(`一括修理に建材${totalCost}が必要`);
      return;
    }

    this.parts -= totalCost;
    for (const building of repairTargets) {
      building.repairFull();
      this.factory.refreshAutoConveyorsAround(building.cell);
    }

    this.cameras.main.shake(70, 0.0012);
    this.setStatus(`一括修理完了: 建材${totalCost}消費`);
  }

  private selectBuildOption(option: BuildOption): void {
    if (!this.isBuildOptionUnlocked(option)) {
      this.setStatus(this.lockedBuildStatus(option), 2600);
      return;
    }

    this.selectedBuild = option.type;
    this.selectedConveyorVariant = option.conveyorVariant ?? 'straight';
    this.stopConveyorPainting();
    this.setMode('build', false);
    this.setStatus(`${option.label}を選択`, 900);
    this.buildButtons.forEach(({ option: buttonOption, box }) => {
      const unlocked = this.isBuildOptionUnlocked(buttonOption);
      box.setStrokeStyle(
        2,
        unlocked
          ? this.isBuildOptionSelected(buttonOption)
            ? 0xffd16a
            : 0x55606a
          : 0x3f4750,
        1,
      );
    });
  }

  private isBuildOptionSelected(option: BuildOption): boolean {
    return (
      option.type === this.selectedBuild &&
      (option.conveyorVariant ?? 'straight') === this.selectedConveyorVariant
    );
  }

  private buildOptionCost(option: BuildOption): number {
    return this.buildCost(option.type, option.conveyorVariant ?? 'straight');
  }

  private selectedBuildDescription(): string {
    if (this.selectedBuild === 'conveyor') {
      return CONVEYOR_DEFS[this.selectedConveyorVariant].description;
    }

    return BUILDING_DEFS[this.selectedBuild].description;
  }

  private buildCost(type: BuildingType, conveyorVariant: ConveyorVariant = 'straight'): number {
    if (type === 'conveyor') {
      return CONVEYOR_DEFS[conveyorVariant].cost;
    }

    return BUILDING_DEFS[type].cost;
  }

  private repairCostFor(building: Building): number {
    if (!this.needsRepair(building)) {
      return 0;
    }

    const baseCost = this.buildCost(building.type, building.conveyorVariant);
    if (!building.alive) {
      return baseCost;
    }

    if (baseCost <= 0) {
      return 0;
    }

    const missingRatio = (building.maxHp - building.hp) / building.maxHp;
    return Math.max(1, Math.ceil(baseCost * missingRatio));
  }

  private repairAllCost(): number {
    return this.grid
      .allBuildings()
      .reduce((total, building) => total + this.repairCostFor(building), 0);
  }

  private repairTargetCount(): number {
    return this.grid
      .allBuildings()
      .filter((building) => this.needsRepair(building)).length;
  }

  private needsRepair(building: Building): boolean {
    return !building.alive || building.hp < building.maxHp;
  }

  private isWeaponBuilding(type: BuildingType): type is WeaponBuildingType {
    return Object.prototype.hasOwnProperty.call(WEAPON_CONFIGS, type);
  }

  private weaponDamageMultiplier(type: WeaponBuildingType): number {
    return type === 'turret' ? 1 : this.modifiers.specialDamageMultiplier;
  }

  private weaponRange(type: WeaponBuildingType): number {
    return this.modifiers.turretRange * WEAPON_CONFIGS[type].rangeMultiplier;
  }

  private cycleMode(): void {
    if (this.mode === 'build') {
      this.setMode('move');
    } else if (this.mode === 'move') {
      this.setMode('demolish');
    } else {
      this.setMode('build');
    }
  }

  private setMode(mode: InteractionMode, announce = true): void {
    this.mode = mode;
    this.stopConveyorPainting();
    this.stopDemolishing();
    if (mode !== 'move') {
      this.movingBuilding = null;
    }

    if (!announce) {
      return;
    }

    const labels: Record<InteractionMode, string> = {
      build: '建設モード',
      move: '移設モード',
      demolish: '解体モード',
    };
    this.setStatus(labels[mode]);
  }

  private drawTurretRange(
    centerX: number,
    centerY: number,
    direction: Direction,
    valid = true,
    buildingType: WeaponBuildingType = 'turret',
  ): void {
    const color = valid ? 0x7ddcff : 0xff4d3d;
    const rangeCenter = this.turretRangeCenter(centerX, centerY, direction);
    const range = this.weaponRange(buildingType);
    this.preview.fillStyle(color, 0.08);
    this.preview.fillCircle(rangeCenter.x, rangeCenter.y, range);
    this.preview.lineStyle(1, color, 0.45);
    this.preview.lineBetween(centerX, centerY, rangeCenter.x, rangeCenter.y);
    this.preview.lineStyle(2, color, 0.62);
    this.preview.strokeCircle(rangeCenter.x, rangeCenter.y, range);
  }

  private turretRangeCenter(
    centerX: number,
    centerY: number,
    direction: Direction,
  ): Phaser.Math.Vector2 {
    const angle = Phaser.Math.DegToRad(DIRECTION_ANGLES[direction]);
    const forwardOffset = TILE_SIZE * 0.75;
    return new Phaser.Math.Vector2(
      centerX + Math.cos(angle) * forwardOffset,
      centerY + Math.sin(angle) * forwardOffset,
    );
  }

  private hoverDiagnostic(): string {
    const pointer = this.input.activePointer;
    if (!pointer || !this.isPointerInWorldView(pointer)) {
      return '';
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return '';
    }

    const building = this.grid.getBuilding(cell);
    if (!building) {
      const resource = this.grid.getResource(cell);
      if (!resource) {
        return '';
      }

      return `診断: ${ITEM_DEFS[this.itemForResource(resource)].label}鉱床。採掘機を置くと資源を取り出せます`;
    }

    return `診断: ${BUILDING_DEFS[building.type].label} - ${this.diagnoseBuilding(building)}`;
  }

  private diagnoseBuilding(building: Building): string {
    if (!building.alive) {
      return '破壊されています。一括修理で復旧できます';
    }

    if (building.type === 'core') {
      return '防衛対象です。敵が到達するとHPが減ります';
    }

    if (this.isWeaponBuilding(building.type)) {
      const ammo = WEAPON_CONFIGS[building.type].ammo;
      const stored = building.stored(ammo);
      return stored > 0
        ? `${ITEM_DEFS[ammo].label}${stored}。射程内に敵が来ると消費して攻撃します`
        : `${ITEM_DEFS[ammo].label}待ち。対応する工場から搬送してください`;
    }

    if (building.type === 'droneTower') {
      const stored = building.stored('drone');
      return stored > 0
        ? `ドローン${stored}。戦闘中に近い敵へ発進します`
        : 'ドローン待ち。ドローン工場から搬送してください';
    }

    if (building.type === 'wall') {
      return `耐久 ${building.hp}/${building.maxHp}。敵を足止めします`;
    }

    if (building.type === 'conveyor') {
      if (!building.item) {
        return '空き。入口と出口の向きが合うと物資が流れます';
      }

      if (this.time.now >= building.nextMoveAt) {
        return `${ITEM_DEFS[building.item].label}が停止中。出口側の向き、満杯、受け取り品目を確認`;
      }

      return `${ITEM_DEFS[building.item].label}を搬送中`;
    }

    if (building.type === 'miner') {
      const resource = this.grid.getResource(building.cell);
      if (!resource) {
        return '鉱床がありません。資源マスへ移設してください';
      }

      const item = this.itemForResource(resource);
      const capacity = storageCapacity(building.type, item);
      if (building.stored(item) >= capacity) {
        return `${ITEM_DEFS[item].label}が満杯。${this.outputDiagnostic(building, item)}`;
      }

      return `${ITEM_DEFS[item].label}を採掘中。${this.outputDiagnostic(building, item)}`;
    }

    const productItems = BUILDING_PRODUCT_ITEMS[building.type] ?? [];
    const blockedProduct = productItems.find(
      (item) => building.stored(item) > 0 && !this.canOutputToDirection(building, item),
    );
    if (blockedProduct) {
      return `${ITEM_DEFS[blockedProduct].label}を出荷待ち。${this.outputDiagnostic(building, blockedProduct)}`;
    }

    const fullItem = building
      .storedItems()
      .find((item) => building.stored(item) >= storageCapacity(building.type, item));
    if (fullItem) {
      return `${ITEM_DEFS[fullItem].label}が満杯。搬送先かレシピを確認`;
    }

    return BUILDING_INPUT_HINTS[building.type] ?? '稼働中';
  }

  private outputDiagnostic(building: Building, item: ItemType): string {
    const targetCell = neighbor(building.cell, building.direction);
    if (!this.grid.inBounds(targetCell)) {
      return '出力先がマップ外です';
    }

    const target = this.grid.getBuilding(targetCell);
    if (!target?.alive) {
      return '出力先に施設がありません';
    }

    if (target.type === 'conveyor') {
      if (target.item) {
        return '搬送先コンベアが満杯です';
      }

      if (target.conveyorVariant === 'undergroundOutput') {
        return '地下出口は通常入力を受け取れません';
      }

      return '出力先は空いています';
    }

    const capacity = storageCapacity(target.type, item);
    if (capacity <= 0) {
      return `${BUILDING_DEFS[target.type].label}は${ITEM_DEFS[item].label}を受け取れません`;
    }

    if (target.stored(item) >= capacity) {
      return `${BUILDING_DEFS[target.type].label}の${ITEM_DEFS[item].label}が満杯です`;
    }

    return '出力先は空いています';
  }

  private canOutputToDirection(building: Building, item: ItemType): boolean {
    return this.outputDiagnostic(building, item) === '出力先は空いています';
  }

  private itemForResource(resource: ResourceKind): ItemType {
    if (resource === 'copper') {
      return 'copperOre';
    }

    if (resource === 'oil') {
      return 'oil';
    }

    return 'ironOre';
  }

  private updatePreview(): void {
    this.preview.clear();
    if (this.gameEnded || this.wave.state === 'upgrade') {
      return;
    }

    const pointer = this.input.activePointer;
    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return;
    }

    const x = MAP_ORIGIN_X + cell.x * TILE_SIZE;
    const y = MAP_ORIGIN_Y + cell.y * TILE_SIZE;

    if (this.mode === 'move' || this.mode === 'demolish') {
      const building = this.grid.getBuilding(cell);
      const moving = this.mode === 'move' && this.movingBuilding !== null;
      const destinationIsValid =
        moving &&
        this.wave.state === 'preparation' &&
        this.grid.isBuildable(cell) &&
        !this.grid.getBuilding(cell)?.alive &&
        (this.movingBuilding!.type !== 'miner' || Boolean(this.grid.getResource(cell)));
      const selectableIsValid =
        this.wave.state === 'preparation' &&
        Boolean(building?.alive);
      const valid = moving ? destinationIsValid : selectableIsValid;
      const color = this.mode === 'move' ? 0x78f2d6 : 0xffa35c;
      this.preview.lineStyle(2, valid ? color : 0xff4d3d, 0.95);
      this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      if (this.mode === 'demolish' && valid) {
        this.preview.lineStyle(3, 0xffa35c, 0.95);
        this.preview.lineBetween(x + 10, y + 10, x + TILE_SIZE - 10, y + TILE_SIZE - 10);
        this.preview.lineBetween(x + TILE_SIZE - 10, y + 10, x + 10, y + TILE_SIZE - 10);
      } else if (this.mode === 'move' && this.movingBuilding) {
        this.preview.lineStyle(2, 0x78f2d6, 0.8);
        this.preview.strokeCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.25);
      }
      return;
    }

    const existing = this.grid.getBuilding(cell);
    if (existing?.alive) {
      const refund = existing.type !== 'core' ? this.buildCost(existing.type, existing.conveyorVariant) : 0;
      const replacementValid =
        existing.type !== 'core' &&
        this.wave.state === 'preparation' &&
        this.isSelectedBuildUnlocked() &&
        this.grid.isBuildable(cell) &&
        (this.selectedBuild !== 'miner' || Boolean(this.grid.getResource(cell))) &&
        this.parts + refund >= this.buildCost(this.selectedBuild, this.selectedConveyorVariant);
      const centerX = x + TILE_SIZE / 2;
      const centerY = y + TILE_SIZE / 2;
      this.preview.lineStyle(2, replacementValid ? 0xffd16a : 0xff4d3d, 0.95);
      this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      if (replacementValid && this.isWeaponBuilding(this.selectedBuild)) {
        this.drawTurretRange(centerX, centerY, this.direction, true, this.selectedBuild);
      } else if (this.isWeaponBuilding(existing.type)) {
        this.drawTurretRange(centerX, centerY, existing.direction, replacementValid, existing.type);
      }

      if (replacementValid) {
        this.preview.fillStyle(0xf5c331, 0.75);
        const angle = Phaser.Math.DegToRad(DIRECTION_ANGLES[this.direction]);
        this.preview.fillTriangle(
          centerX + Math.cos(angle) * 10,
          centerY + Math.sin(angle) * 10,
          centerX + Math.cos(angle + 2.5) * 8,
          centerY + Math.sin(angle + 2.5) * 8,
          centerX + Math.cos(angle - 2.5) * 8,
          centerY + Math.sin(angle - 2.5) * 8,
        );
      }
      return;
    }

    const valid =
      this.wave.state === 'preparation' &&
      this.isSelectedBuildUnlocked() &&
      this.grid.isBuildable(cell) &&
      (this.selectedBuild !== 'miner' || Boolean(this.grid.getResource(cell))) &&
      this.parts >= this.buildCost(this.selectedBuild, this.selectedConveyorVariant);
    this.preview.lineStyle(2, valid ? 0x7dff9f : 0xff4d3d, 0.95);
    this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    const centerX = x + TILE_SIZE / 2;
    const centerY = y + TILE_SIZE / 2;
    if (this.isWeaponBuilding(this.selectedBuild)) {
      this.drawTurretRange(centerX, centerY, this.direction, valid, this.selectedBuild);
      this.preview.lineStyle(2, valid ? 0x7dff9f : 0xff4d3d, 0.95);
      this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    this.preview.fillStyle(0xf5c331, 0.75);
    const angle = Phaser.Math.DegToRad(DIRECTION_ANGLES[this.direction]);
    this.preview.fillTriangle(
      centerX + Math.cos(angle) * 10,
      centerY + Math.sin(angle) * 10,
      centerX + Math.cos(angle + 2.5) * 8,
      centerY + Math.sin(angle + 2.5) * 8,
      centerX + Math.cos(angle - 2.5) * 8,
      centerY + Math.sin(angle - 2.5) * 8,
    );
  }

  private updateUi(time: number): void {
    const stage = this.currentStage();
    this.ui.wave.setText(
      `ウェーブ ${Math.min(this.wave.wave + 1, this.wave.maxWave)}/${this.wave.maxWave}`,
    );
    this.ui.stage.setText(stage.label);
    const phaseText =
      this.wave.state === 'preparation'
        ? '準備フェーズ'
        : this.wave.state === 'combat'
          ? '戦闘フェーズ'
          : this.wave.state === 'upgrade'
            ? '強化選択中'
            : '完了';
    this.ui.phase.setText(phaseText);
    this.ui.core.setText(`コアHP ${this.core.hp}/${this.core.maxHp}`);
    this.ui.parts.setText(`建材 ${Math.floor(this.parts)}`);
    this.ui.ore.setText(
      `鉄 ${this.factory.itemInNetwork('ironOre')}  銅 ${this.factory.itemInNetwork('copperOre')}  油 ${this.factory.itemInNetwork('oil')}`,
    );
    this.ui.ammo.setText(
      `弾 ${this.factory.ammoInNetwork()}  強 ${this.factory.itemInNetwork('enhancedAmmo')}  焼 ${this.factory.itemInNetwork('incendiaryAmmo')}  EMP ${this.factory.itemInNetwork('empAmmo')}`,
    );
    const buildLabel =
      this.selectedBuild === 'conveyor'
        ? CONVEYOR_DEFS[this.selectedConveyorVariant].label
        : BUILDING_DEFS[this.selectedBuild].label;
    this.ui.selected.setText(
      `モード:${this.modeLabel(this.mode)}  選択:${buildLabel}  向き:${this.directionLabel(
        this.direction,
      )}\n機能:${this.selectedBuildDescription()}`,
    );
    this.ui.readyButton
      .setFillStyle(this.wave.state === 'preparation' ? 0x1f4c3a : 0x24303a, 1)
      .setStrokeStyle(2, this.wave.state === 'preparation' ? 0x79f0a4 : 0x57606a, 1);
    this.ui.readyText.setAlpha(this.wave.state === 'preparation' ? 1 : 0.45);
    const repairCost = this.repairAllCost();
    const repairCount = this.repairTargetCount();
    const canRepair = this.wave.state === 'preparation' && repairCount > 0 && this.parts >= repairCost;
    this.ui.repairButton
      .setFillStyle(canRepair ? 0x3a3421 : 0x26303a, 1)
      .setStrokeStyle(2, canRepair ? 0xffd16a : 0x6b7480, 1);
    this.ui.repairText
      .setText(repairCount > 0 ? `一括修理 ${repairCost}` : '修理不要')
      .setAlpha(this.wave.state === 'preparation' ? 1 : 0.45);
    this.ui.recipeButton
      .setFillStyle(this.recipeOverlay ? 0x1c4b5a : 0x223242, 1)
      .setStrokeStyle(2, this.recipeOverlay ? 0xffd16a : 0x7ddcff, 1);
    this.ui.moveButton
      .setFillStyle(this.mode === 'move' ? 0x235d58 : 0x22343c, 1)
      .setStrokeStyle(2, this.mode === 'move' ? 0xffd16a : 0x78f2d6, 1);
    this.ui.demolishButton
      .setFillStyle(this.mode === 'demolish' ? 0x5a3424 : 0x3a2a24, 1)
      .setStrokeStyle(2, this.mode === 'demolish' ? 0xffd16a : 0xffa35c, 1);

    if (this.statusUntil > 0 && time > this.statusUntil) {
      this.statusMessage = '';
      this.statusUntil = 0;
    }

    if (this.statusUntil <= 0) {
      this.ui.status.setText(this.hoverDiagnostic());
    }
  }

  private addEnemy(): Enemy {
    const enemy = new Enemy(this);
    this.enemies.push(enemy);
    return enemy;
  }

  private addBullet(): Bullet {
    const bullet = new Bullet(this);
    this.bullets.push(bullet);
    return bullet;
  }

  private gameOver(): void {
    if (this.gameEnded) {
      return;
    }

    this.gameEnded = true;
    this.wave.stop();
    this.saveFactoryState();
    this.showEndOverlay('GAME OVER', 'コアが破壊された。工場状態を保存しました');
  }

  private toggleRecipeOverlay(): void {
    if (this.recipeOverlay) {
      this.hideRecipeOverlay();
      return;
    }

    this.recipePage = 0;
    this.showRecipeOverlay();
  }

  private showStageUnlockOverlay(stage: StageDefinition): void {
    this.hideStageUnlockOverlay();

    const container = this.add.container(0, 0).setDepth(255);
    const shade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02050a, 0.74)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1038, 606, 0x101820, 0.97)
      .setStrokeStyle(2, 0xd9a85f, 0.95)
      .setInteractive({ useHandCursor: true });
    const eyebrow = this.add
      .text(GAME_WIDTH / 2, 74, '機能解放', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#7ddcff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(GAME_WIDTH / 2, 104, stage.label, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '31px',
        color: '#fff3cc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const objective = this.add
      .text(GAME_WIDTH / 2, 140, `目標: ${stage.objective}`, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#dce8ef',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const cardObjects: Phaser.GameObjects.GameObject[] = [];
    stage.unlockCards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      cardObjects.push(
        ...this.createRecipeGuideCard(
          92 + column * 510,
          180 + row * 144,
          490,
          132,
          card,
        ),
      );
    });

    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        660,
        stage.unlockWave > 0
          ? '閉じるとアップグレード選択に戻ります'
          : '閉じると準備フェーズを開始します',
        {
          fontFamily: '"Yu Gothic", Meiryo, sans-serif',
          fontSize: '13px',
          color: '#9fb3c3',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);
    const closeButton = this.add
      .rectangle(GAME_WIDTH / 2, 706, 176, 36, 0x223d4a, 1)
      .setStrokeStyle(2, 0x7ddcff, 1)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add
      .text(GAME_WIDTH / 2, 706, '閉じる', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const close = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.hideStageUnlockOverlay();
    };
    shade.on('pointerdown', close);
    panel.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => event.stopPropagation(),
    );
    closeButton.on('pointerdown', close);

    container.add([
      shade,
      panel,
      eyebrow,
      title,
      objective,
      ...cardObjects,
      hint,
      closeButton,
      closeText,
    ]);
    this.stageUnlockOverlay = container;
    this.registerUiObject(container);
  }

  private hideStageUnlockOverlay(): void {
    this.stageUnlockOverlay?.destroy();
    this.stageUnlockOverlay = undefined;
  }

  private showRecipeOverlay(): void {
    if (this.recipeOverlay) {
      return;
    }

    const page = RECIPE_GUIDE_PAGES[this.recipePage] ?? RECIPE_GUIDE_PAGES[0];
    const container = this.add.container(0, 0).setDepth(245);
    const shade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02050a, 0.78)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const fallbackPanel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1038, 632, 0x101820, 0.96)
      .setStrokeStyle(2, 0xd9a85f, 0.95)
      .setInteractive({ useHandCursor: true });
    const title = this.add
      .text(GAME_WIDTH / 2, 72, page.title, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '31px',
        color: '#fff3cc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const closeHint = this.add
      .text(GAME_WIDTH / 2, 110, `レシピ一覧 ${this.recipePage + 1}/${RECIPE_GUIDE_PAGES.length}`, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '14px',
        color: '#b7cad8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const pageObjects: Phaser.GameObjects.GameObject[] = [];
    page.cards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      pageObjects.push(
        ...this.createRecipeGuideCard(
          92 + column * 510,
          136 + row * 132,
          490,
          124,
          card,
        ),
      );
    });

    const prevButton = this.add
      .rectangle(GAME_WIDTH / 2 - 108, 714, 160, 34, 0x1f2b34, 1)
      .setStrokeStyle(2, 0x7ddcff, 0.8)
      .setInteractive({ useHandCursor: true });
    const prevText = this.add
      .text(GAME_WIDTH / 2 - 108, 714, '前ページ', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const nextButton = this.add
      .rectangle(GAME_WIDTH / 2 + 108, 714, 160, 34, 0x1f2b34, 1)
      .setStrokeStyle(2, 0x7ddcff, 0.8)
      .setInteractive({ useHandCursor: true });
    const nextText = this.add
      .text(GAME_WIDTH / 2 + 108, 714, '次ページ', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const closeButton = this.add
      .rectangle(GAME_WIDTH - 168, 714, 128, 34, 0x35282a, 1)
      .setStrokeStyle(2, 0xffa35c, 0.9)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add
      .text(GAME_WIDTH - 168, 714, '閉じる', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const close = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.hideRecipeOverlay();
    };
    const showPage = (direction: number) => (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.recipePage =
        (this.recipePage + direction + RECIPE_GUIDE_PAGES.length) %
        RECIPE_GUIDE_PAGES.length;
      this.hideRecipeOverlay();
      this.showRecipeOverlay();
    };
    shade.on('pointerdown', close);
    fallbackPanel.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => event.stopPropagation(),
    );
    prevButton.on('pointerdown', showPage(-1));
    nextButton.on('pointerdown', showPage(1));
    closeButton.on('pointerdown', close);

    container.add([
      shade,
      fallbackPanel,
      title,
      closeHint,
      ...pageObjects,
      prevButton,
      prevText,
      nextButton,
      nextText,
      closeButton,
      closeText,
    ]);
    this.recipeOverlay = container;
    this.registerUiObject(container);
  }

  private createRecipeGuideCard(
    x: number,
    y: number,
    width: number,
    height: number,
    card: RecipeGuideCard,
  ): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add
      .rectangle(x, y, width, height, 0x0b1219, 0.92)
      .setOrigin(0)
      .setStrokeStyle(2, card.accent, 0.75);
    objects.push(bg);

    const iconBaseX = x + 30;
    const iconY = y + 34;
    card.icons.forEach((key, index) => {
      const icon = this.add
        .sprite(iconBaseX + index * 36, iconY, key)
        .setDisplaySize(this.recipeIconSize(key), this.recipeIconSize(key));
      objects.push(icon);
    });

    const textX = x + 166;
    const textWidth = width - 184;
    const title = this.add.text(textX, y + 13, card.title, {
      fontFamily: '"Yu Gothic", Meiryo, sans-serif',
      fontSize: '17px',
      color: '#fff3cc',
      fontStyle: 'bold',
      wordWrap: { width: textWidth },
    });
    const subtitle = this.add.text(textX, y + 41, card.subtitle, {
      fontFamily: '"Yu Gothic", Meiryo, sans-serif',
      fontSize: '14px',
      color: `#${card.accent.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      wordWrap: { width: textWidth },
    });
    const body = this.add.text(textX, y + 65, this.wrapRecipeText(card.body), {
      fontFamily: '"Yu Gothic", Meiryo, sans-serif',
      fontSize: '12px',
      color: '#dce8ef',
      lineSpacing: 2,
      wordWrap: { width: textWidth },
    });
    objects.push(title, subtitle, body);

    return objects;
  }

  private wrapRecipeText(text: string, maxChars = 23): string {
    const lines: string[] = [];
    let rest = text;

    while (rest.length > maxChars) {
      const slice = rest.slice(0, maxChars + 1);
      const breakPoints = ['。', '、', ' ', '/'];
      const breakIndex = breakPoints.reduce(
        (best, point) => Math.max(best, slice.lastIndexOf(point)),
        -1,
      );
      const useBreak =
        breakIndex >= Math.floor(maxChars * 0.55) ? breakIndex + 1 : maxChars;
      lines.push(rest.slice(0, useBreak));
      rest = rest.slice(useBreak);
    }

    if (rest.length > 0) {
      lines.push(rest);
    }

    return lines.join('\n');
  }

  private recipeIconSize(key: string): number {
    if (key.startsWith('tile-')) {
      return 42;
    }

    if (key.startsWith('item-')) {
      return 26;
    }

    return 36;
  }

  private hideRecipeOverlay(): void {
    this.recipeOverlay?.destroy();
    this.recipeOverlay = undefined;
  }

  private showEndOverlay(title: string, body: string): void {
    const container = this.add.container(0, 0).setDepth(240);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02050a, 0.72).setOrigin(0);
    const panel = this.add
      .rectangle(590, 380, 430, 210, 0x111820, 0.97)
      .setStrokeStyle(2, title === 'CLEAR' ? 0x69e47c : 0xff6b1a, 1);
    const titleText = this.add
      .text(590, 330, title, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '36px',
        color: '#fff4d2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const bodyText = this.add
      .text(590, 372, body, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '19px',
        color: '#dce8ef',
      })
      .setOrigin(0.5);
    const restart = this.add
      .rectangle(590, 430, 158, 42, 0x223d4a, 1)
      .setStrokeStyle(2, 0x7ddcff, 1)
      .setInteractive({ useHandCursor: true });
    const restartText = this.add
      .text(590, 430, 'リスタート', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    restart.on('pointerdown', () => this.scene.restart());
    container.add([shade, panel, titleText, bodyText, restart, restartText]);
    this.registerUiObject(container);
  }

  private drawPanel(x: number, y: number, width: number, height: number, title: string): void {
    this.add
      .rectangle(x, y, width, height, 0x0d1218, 0.94)
      .setOrigin(0)
      .setDepth(90)
      .setStrokeStyle(2, 0x766049, 1);
    this.addText(x + 14, y + 10, title, 18, '#fff3cc', true);
  }

  private addText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
    bold = false,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? 'bold' : 'normal',
        lineSpacing: 4,
      })
      .setDepth(101);
  }

  private directionLabel(direction: Direction): string {
    if (direction === 'up') {
      return '上';
    }
    if (direction === 'right') {
      return '右';
    }
    if (direction === 'down') {
      return '下';
    }
    return '左';
  }

  private modeLabel(mode: InteractionMode): string {
    if (mode === 'move') {
      return '移設';
    }
    if (mode === 'demolish') {
      return '解体';
    }
    return '建設';
  }

  private resumeAudio(): void {
    const context = this.ensureAudioContext();
    if (context?.state === 'suspended') {
      void context.resume();
    }
  }

  private playBuildSound(type: BuildingType): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().then(() => this.playBuildSound(type));
      return;
    }

    if (type === 'conveyor') {
      this.playTone(context, 'square', 360, 560, 0.055, 0.055, 'highpass', 500);
      this.playTone(context, 'triangle', 680, 420, 0.05, 0.035, 'bandpass', 900, 0.035);
      return;
    }

    if (type === 'wall') {
      this.playTone(context, 'square', 120, 74, 0.12, 0.085, 'lowpass', 420);
      this.playTone(context, 'triangle', 260, 130, 0.08, 0.045, 'lowpass', 600, 0.03);
      return;
    }

    if (this.isWeaponBuilding(type) || type === 'droneTower') {
      this.playTone(context, 'triangle', 320, 740, 0.13, 0.075, 'bandpass', 1100);
      this.playTone(context, 'square', 170, 120, 0.09, 0.035, 'lowpass', 480, 0.045);
      return;
    }

    this.playTone(context, 'triangle', 240, 620, 0.11, 0.065, 'bandpass', 850);
    this.playTone(context, 'sine', 520, 780, 0.08, 0.035, 'highpass', 450, 0.04);
  }

  private playWeaponShotSound(type: WeaponSoundType): void {
    const context = this.ensureAudioContext();
    if (!context || context.state === 'suspended') {
      return;
    }

    if (type === 'sniperTurret') {
      this.playTone(context, 'triangle', 980, 520, 0.16, 0.105, 'bandpass', 1400);
      return;
    }

    if (type === 'cannonTurret') {
      this.playTone(context, 'sawtooth', 210, 58, 0.22, 0.14, 'lowpass', 850);
      this.playTone(context, 'square', 82, 46, 0.18, 0.05, 'lowpass', 420, 0.025);
      return;
    }

    if (type === 'empTurret') {
      this.playTone(context, 'sine', 260, 1320, 0.26, 0.09, 'bandpass', 980);
      this.playTone(context, 'triangle', 640, 190, 0.2, 0.045, 'highpass', 520, 0.04);
      return;
    }

    if (type === 'missileTurret') {
      this.playTone(context, 'sawtooth', 160, 44, 0.34, 0.16, 'lowpass', 700);
      this.playTone(context, 'triangle', 540, 120, 0.18, 0.055, 'lowpass', 1100);
      return;
    }

    if (type === 'droneTower') {
      this.playTone(context, 'triangle', 210, 620, 0.24, 0.08, 'bandpass', 720);
      this.playTone(context, 'sine', 520, 820, 0.16, 0.035, 'bandpass', 1100, 0.05);
      return;
    }

    if (type === 'combatDrone') {
      this.playTone(context, 'square', 760, 420, 0.07, 0.045, 'highpass', 650);
      return;
    }

    this.playTone(context, 'square', 520, 180, 0.1, 0.12, 'lowpass', 1600);
  }

  private playTone(
    context: AudioContext,
    oscillatorType: OscillatorType,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    filterType: BiquadFilterType,
    filterFrequency: number,
    delay = 0,
  ): void {
    const now = context.currentTime;
    const start = now + delay;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = oscillatorType;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      start + duration * 0.8,
    );
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const windowWithAudio = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor = window.AudioContext ?? windowWithAudio.webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }
}
