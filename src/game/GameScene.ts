import Phaser from 'phaser';
import recipeBoardUrl from '../../assets/images/recipe-board-generated.png';
import generatedConveyorsUrl from '../../assets/sprites/generated-conveyors.png';
import generatedSpritesUrl from '../../assets/sprites/generated-sprites.png';
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
  ItemType,
  LEFT_EXPANSION_COLUMNS,
  MAP_HEIGHT_PX,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  MAP_WIDTH_PX,
  TILE_SIZE,
  UpgradeId,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_WIDTH,
  WORLD_VIEW_X,
  WORLD_VIEW_Y,
  manhattan,
  rotateDirection,
  sameCell,
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
    optionIds: ['conveyor-straight', 'conveyor-junction-three', 'conveyor-junction-four'],
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

const BUILD_OPTION_BY_ID = new Map(BUILD_OPTIONS.map((option) => [option.id, option]));
const BUILD_MENU_START_Y = 306;
const BUILD_MENU_ROW_HEIGHT = 31;

const RECIPE_ROWS = [
  {
    building: '採掘機',
    output: '鉄 / 銅 / 原油',
    recipe: '資源マスから採掘し、向きの方向へ排出',
  },
  {
    building: '弾薬工場',
    output: '弾',
    recipe: '鉄 1 -> 弾 1',
  },
  {
    building: '金属板工場',
    output: '鉄板 / 銅板',
    recipe: '鉄 1 -> 鉄板 1 / 銅 1 -> 銅板 1',
  },
  {
    building: 'ワイヤー工場',
    output: 'ワイヤー',
    recipe: '銅 1 -> ワイヤー 1',
  },
  {
    building: 'プラスチック工場',
    output: 'プラスチック',
    recipe: '原油 1 -> プラスチック 1',
  },
  {
    building: '燃料工場',
    output: '燃料',
    recipe: '原油 1 -> 燃料 1',
  },
  {
    building: '特殊弾工場',
    output: '強化弾 / 焼夷弾 / EMP弾',
    recipe: '鉄板+銅板 / 鉄板+燃料 / 線+樹脂',
  },
  {
    building: 'ミサイル工場',
    output: 'ミサイル',
    recipe: '鉄板 2 + 線 2 + 燃料 4 -> ミサイル',
  },
  {
    building: 'ドローン工場',
    output: 'ドローン',
    recipe: '鉄板 5 + 線 5 + 樹脂 5 -> ドローン',
  },
  {
    building: 'タレット',
    output: '通常射撃',
    recipe: '弾を消費して近距離を連射',
  },
  {
    building: 'スナイパー',
    output: '長射程射撃',
    recipe: '強化弾のみ使用。高威力だが低速',
  },
  {
    building: '大型砲台',
    output: '範囲爆撃',
    recipe: '焼夷弾のみ使用。着弾地点を範囲攻撃',
  },
  {
    building: '電磁砲台',
    output: 'EMP停止',
    recipe: 'EMP弾のみ使用。範囲内の敵を3秒停止',
  },
  {
    building: 'ミサイル砲台',
    output: '超長射程爆撃',
    recipe: 'ミサイルのみ使用。高威力の範囲攻撃',
  },
  {
    building: 'ドローン司令塔',
    output: '戦闘ドローン',
    recipe: 'ドローンを消費して追撃ユニットを発進',
  },
];

type WeaponBuildingType =
  | 'turret'
  | 'sniperTurret'
  | 'cannonTurret'
  | 'empTurret'
  | 'missileTurret';

interface WeaponConfig {
  ammo: ItemType;
  rangeMultiplier: number;
  damageMultiplier: number;
  fireIntervalMultiplier: number;
  color: number;
  radius?: number;
  stunMs?: number;
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
  },
  empTurret: {
    ammo: 'empAmmo',
    rangeMultiplier: 2,
    damageMultiplier: 0,
    fireIntervalMultiplier: 2.2,
    color: 0x68d7ff,
    radius: 78,
    stunMs: 3000,
  },
  missileTurret: {
    ammo: 'missile',
    rangeMultiplier: 5,
    damageMultiplier: 10,
    fireIntervalMultiplier: 10,
    color: 0xfff0a6,
    radius: 96,
  },
};

type InteractionMode = 'build' | 'move' | 'demolish';

interface BuildButton {
  option: BuildOption;
  box: Phaser.GameObjects.Rectangle;
}

export class GameScene extends Phaser.Scene {
  grid!: GridSystem;
  factory!: FactorySystem;
  wave!: WaveSystem;
  upgrades!: UpgradeSystem;
  core!: Building;
  parts = 1000000;
  modifiers = {
    turretDamage: 34,
    turretRange: 165,
    beltIntervalMs: 520,
    productionIntervalMs: 1650,
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
  private worldCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private readonly worldObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly uiObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private isPanning = false;
  private spacePanning = false;
  private lastPanPoint: Phaser.Math.Vector2 | null = null;
  private gameEnded = false;
  private statusMessage = '準備フェーズでラインを組み、準備完了で戦闘開始';
  private statusUntil = 0;
  private audioContext?: AudioContext;
  private ui!: {
    wave: Phaser.GameObjects.Text;
    phase: Phaser.GameObjects.Text;
    core: Phaser.GameObjects.Text;
    parts: Phaser.GameObjects.Text;
    ore: Phaser.GameObjects.Text;
    ammo: Phaser.GameObjects.Text;
    controls: Phaser.GameObjects.Text;
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
    this.load.image('recipe-board-generated', recipeBoardUrl);
  }

  create(): void {
    createPixelTextures(this);
    this.replaceGeneratedTextures();
    this.createBackdrop();

    this.grid = new GridSystem();
    this.grid.render(this);
    this.factory = new FactorySystem(this, this.grid);
    this.wave = new WaveSystem(this);
    this.upgrades = new UpgradeSystem(this);
    this.preview = this.add.graphics().setDepth(85);

    this.createPools();
    this.createStarterBase();
    this.captureInitialWorldObjects();
    this.configureCameras();
    this.createUi();
    this.captureInitialUiObjects();
    this.createInput();
    this.createHitEvents();
    this.wave.startPreparation();
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
    } else {
      this.core.heal(120);
      this.setStatus('コアHPを回復');
    }
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

  winGame(): void {
    this.gameEnded = true;
    this.wave.stop();
    this.showEndOverlay('CLEAR', '10ウェーブ防衛成功');
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
      .centerOn(MAP_WIDTH_PX * 0.75, MAP_HEIGHT_PX * 0.5)
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
      { key: 'item-ore', frame: 5, width: 10, height: 10 },
      { key: 'item-ammo', frame: 6, width: 10, height: 10 },
      { key: 'enemy-small', frame: 7, width: 24, height: 24 },
      { key: 'enemy-heavy', frame: 8, width: 28, height: 28 },
      { key: 'enemy-suicide', frame: 9, width: 24, height: 24 },
      { key: 'tile-lava', frame: 10, width: TILE_SIZE, height: TILE_SIZE, fill: 0x2b1714 },
      { key: 'tile-resource', frame: 5, width: TILE_SIZE, height: TILE_SIZE, fill: 0x303436 },
      { key: 'conveyor-curveDown', sheet: 'generated-conveyors', frame: 0, width: 30, height: 30 },
      { key: 'conveyor-curveUp', sheet: 'generated-conveyors', frame: 1, width: 30, height: 30 },
      { key: 'conveyor-junctionThree', sheet: 'generated-conveyors', frame: 2, width: 30, height: 30 },
      { key: 'conveyor-junctionFour', sheet: 'generated-conveyors', frame: 4, width: 30, height: 30 },
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

  private createStarterBase(): void {
    const shift = LEFT_EXPANSION_COLUMNS;
    this.core = this.factory.createBuilding('core', { x: 10 + shift, y: 10 }, 'up');
    this.factory.createBuilding('miner', { x: 4 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 5 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 6 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 7 + shift, y: 8 }, 'right');
    const ammoFactory = this.factory.createBuilding('ammoFactory', { x: 8 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 9 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 10 + shift, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 11 + shift, y: 8 }, 'down');
    this.factory.createBuilding('conveyor', { x: 11 + shift, y: 9 }, 'down');
    this.factory.createBuilding('conveyor', { x: 11 + shift, y: 10 }, 'right');
    this.factory.createBuilding('conveyor', { x: 12 + shift, y: 10 }, 'right');
    const turret = this.factory.createBuilding('turret', { x: 13 + shift, y: 10 }, 'left');

    ammoFactory.oreStored = 2;
    turret.ammoStored = 8;
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
          this.tryDemolish(pointer);
        } else {
          this.tryPlace(pointer);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.panToPointer(pointer);
      }
    });

    this.input.on('pointerup', () => this.stopPan());
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

    const selectedText = this.addText(WORLD_VIEW_X + 26, lowerPanelY + 54, '', 12, '#e6eef4');
    selectedText.setWordWrapWidth(WORLD_VIEW_WIDTH - 340);
    const statusText = this.addText(WORLD_VIEW_X + 26, lowerPanelY + 82, this.statusMessage, 13, '#fff0c4');
    statusText.setWordWrapWidth(WORLD_VIEW_WIDTH - 340);

    this.ui = {
      wave: this.addText(24, 36, '', 21, '#fff3cc', true),
      phase: this.addText(24, 70, '', 18, '#e6eef4'),
      core: this.addText(24, 108, '', 18, '#7fdcff'),
      parts: this.addText(24, 142, '', 17, '#d6e3eb'),
      ore: this.addText(24, 172, '', 15, '#d6e3eb'),
      ammo: this.addText(24, 198, '', 13, '#ffb174'),
      controls: this.addText(WORLD_VIEW_X + 26, lowerPanelY + 28, 'ホイール:ズーム  ドラッグ/WASD:移動  R:向き  M:移設  X:解体', 14, '#fff3cc', true),
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

    this.drawPanel(8, 260, 224, 492, '建設メニュー');
    this.createBuildMenu();

    this.drawPanel(WORLD_VIEW_X, lowerPanelY, WORLD_VIEW_WIDTH, 96, '操作ライン');
    this.updateUi(this.time.now);
  }

  private createBuildMenu(): void {
    this.clearBuildMenu();
    let row = 0;

    for (const group of BUILD_GROUPS) {
      const y = BUILD_MENU_START_Y + row * BUILD_MENU_ROW_HEIGHT;
      const expanded = this.expandedBuildGroups.has(group.id);
      const headerBox = this.trackBuildMenuObject(
          this.add
          .rectangle(118, y, 178, 25, 0x202a33, 1)
          .setOrigin(0.5)
          .setStrokeStyle(2, expanded ? 0xffd16a : 0x56616b, 1)
          .setDepth(100)
          .setInteractive({ useHandCursor: true }),
      );
      this.trackBuildMenuObject(
        this.addText(34, y - 10, `${expanded ? '-' : '+'} ${group.label}`, 12, '#fff3cc', true),
      );
      this.trackBuildMenuObject(
        this.addText(180, y - 8, `${group.optionIds.length}`, 10, '#9fb3c3', true),
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
      row += 1;

      if (!expanded) {
        continue;
      }

      for (const optionId of group.optionIds) {
        const option = BUILD_OPTION_BY_ID.get(optionId);
        if (!option) {
          continue;
        }

        const optionY = BUILD_MENU_START_Y + row * BUILD_MENU_ROW_HEIGHT;
        const box = this.trackBuildMenuObject(
          this.add
            .rectangle(118, optionY, 178, 27, 0x151a20, 1)
            .setOrigin(0.5)
            .setStrokeStyle(2, this.isBuildOptionSelected(option) ? 0xffd16a : 0x55606a, 1)
            .setDepth(100)
            .setInteractive({ useHandCursor: true }),
        );
        this.trackBuildMenuObject(
          this.add.sprite(42, optionY, option.iconKey).setDisplaySize(21, 21).setDepth(101),
        );
        this.trackBuildMenuObject(
          this.addText(56, optionY - 12, option.label, 10, '#e8edf2', true),
        );
        this.trackBuildMenuObject(
          this.addText(56, optionY + 1, `${option.detail} / 建材${this.buildOptionCost(option)}`, 8, '#cfd8df'),
        );

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
        box.on('pointerover', () => box.setFillStyle(0x22303a, 1));
        box.on('pointerout', () => box.setFillStyle(0x151a20, 1));

        this.buildButtons.push({ option, box });
        row += 1;
      }
    }
  }

  private trackBuildMenuObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.buildMenuObjects.push(object);
    this.registerUiObject(object);
    return object;
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
      turret.removeStored(config.ammo);
      turret.flash(0xffe0a3);
      this.playTurretShotSound();
      const bullet = this.bullets.find((candidate) => !candidate.active) ?? this.addBullet();
      const position = turret.getWorldPosition();
      bullet.fire(
        position.x,
        position.y,
        target,
        this.modifiers.turretDamage * config.damageMultiplier,
        config.color,
        config.radius || config.stunMs
          ? (_target, hitPosition) => {
              this.affectEnemiesArea(
                hitPosition,
                config.radius ?? 20,
                this.modifiers.turretDamage * config.damageMultiplier,
                config.stunMs ?? 0,
                config.color,
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
          bullet.fire(x, y, target, this.modifiers.turretDamage * 0.45, 0x9de8ff);
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

    this.explosion(position, color, Math.max(0.75, radius / 80));
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

  private tryPlace(pointer: Phaser.Input.Pointer): void {
    if (this.wave.state !== 'preparation') {
      this.setStatus('戦闘中は準備できません');
      return;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return;
    }

    const existing = this.grid.getBuilding(cell);
    if (existing?.alive) {
      this.setStatus('そのマスには施設があります');
      return;
    }

    if (!this.grid.isBuildable(cell)) {
      this.setStatus('そこには建設できません');
      return;
    }

    if (this.selectedBuild === 'miner' && !this.grid.getResource(cell)) {
      this.setStatus('採掘機は鉄/銅/原油ノードに設置');
      return;
    }

    const cost = this.buildCost(this.selectedBuild, this.selectedConveyorVariant);
    if (this.parts < cost) {
      this.setStatus('建材が不足');
      return;
    }

    if (existing && !existing.alive) {
      this.factory.removeBuilding(existing);
    }

    this.parts -= cost;
    const building = this.factory.createBuilding(
      this.selectedBuild,
      cell,
      this.direction,
      this.selectedBuild === 'conveyor' ? this.selectedConveyorVariant : 'straight',
    );
    const shape =
      this.selectedBuild === 'conveyor'
        ? `（${CONVEYOR_DEFS[building.conveyorVariant].label}）`
        : '';
    this.setStatus(`${BUILDING_DEFS[this.selectedBuild].label}${shape}を建設`);
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

    if (building.type === 'miner' && this.grid.getTerrain(cell) !== 'resource') {
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

  private tryDemolish(pointer: Phaser.Input.Pointer): void {
    if (this.wave.state !== 'preparation') {
      this.setStatus('戦闘中は解体できません');
      return;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return;
    }

    const building = this.grid.getBuilding(cell);
    if (!building?.alive || building.type === 'core') {
      this.setStatus('解体する施設をクリック');
      return;
    }

    const refund = this.buildCost(building.type, building.conveyorVariant);
    const position = building.getWorldPosition();
    this.parts += refund;
    this.factory.removeBuilding(building);
    this.floatText(position, `+${refund}`, 0xffd27a);
    this.setStatus(`${BUILDING_DEFS[building.type].label}を解体`);
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
    this.selectedBuild = option.type;
    this.selectedConveyorVariant = option.conveyorVariant ?? 'straight';
    this.setMode('build', false);
    this.setStatus(`${option.label}を選択`, 900);
    this.buildButtons.forEach(({ option: buttonOption, box }) => {
      box.setStrokeStyle(
        2,
        this.isBuildOptionSelected(buttonOption) ? 0xffd16a : 0x55606a,
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
        (this.movingBuilding!.type !== 'miner' || this.grid.getTerrain(cell) === 'resource');
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
      const canRotate = existing.type !== 'core' && this.wave.state === 'preparation';
      this.preview.lineStyle(2, canRotate ? 0x7ddcff : 0xff4d3d, 0.95);
      this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      if (this.isWeaponBuilding(existing.type)) {
        this.drawTurretRange(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          existing.direction,
          canRotate,
          existing.type,
        );
      }
      return;
    }

    const valid =
      this.wave.state === 'preparation' &&
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
    this.ui.wave.setText(
      `ウェーブ ${Math.min(this.wave.wave + 1, this.wave.maxWave)}/${this.wave.maxWave}`,
    );
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
      )}  機能:${this.selectedBuildDescription()}`,
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
      this.ui.status.setText('鉄を弾薬工場へ、弾をタレットへ実搬送する');
      this.statusUntil = 0;
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
    this.showEndOverlay('GAME OVER', 'コアが破壊された');
  }

  private toggleRecipeOverlay(): void {
    if (this.recipeOverlay) {
      this.hideRecipeOverlay();
      return;
    }

    this.showRecipeOverlay();
  }

  private showRecipeOverlay(): void {
    if (this.recipeOverlay) {
      return;
    }

    const container = this.add.container(0, 0).setDepth(245);
    const shade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02050a, 0.78)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const board = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'recipe-board-generated')
      .setDisplaySize(1030, 630)
      .setAlpha(0.98)
      .setInteractive({ useHandCursor: true });
    const fallbackPanel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1010, 600, 0x101820, 0.55)
      .setStrokeStyle(2, 0xd9a85f, 0.95)
      .setInteractive({ useHandCursor: true });
    const title = this.add
      .text(GAME_WIDTH / 2, 88, 'レシピ一覧', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '32px',
        color: '#fff3cc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const closeHint = this.add
      .text(GAME_WIDTH / 2, 122, 'クリックで閉じる', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '13px',
        color: '#b7cad8',
      })
      .setOrigin(0.5);
    const tableX = 190;
    const tableY = 146;
    const tableWidth = 800;
    const headerHeight = 34;
    const rowHeight = 60;
    const visibleRows = Math.ceil(RECIPE_ROWS.length / 2);
    const tableHeight = headerHeight + rowHeight * visibleRows;
    const halfWidth = tableWidth / 2;
    const buildingColWidth = 112;
    const tableBg = this.add
      .rectangle(tableX, tableY, tableWidth, tableHeight, 0x0b1219, 0.9)
      .setOrigin(0)
      .setStrokeStyle(2, 0x375162, 0.9)
      .setInteractive({ useHandCursor: true });
    const tableGrid = this.add.graphics();
    tableGrid.lineStyle(1, 0x375162, 0.82);
    tableGrid.strokeRect(tableX, tableY, tableWidth, tableHeight);
    tableGrid.lineBetween(tableX, tableY + headerHeight, tableX + tableWidth, tableY + headerHeight);
    tableGrid.lineBetween(tableX + halfWidth, tableY, tableX + halfWidth, tableY + tableHeight);
    tableGrid.lineBetween(
      tableX + buildingColWidth,
      tableY,
      tableX + buildingColWidth,
      tableY + tableHeight,
    );
    tableGrid.lineBetween(
      tableX + halfWidth + buildingColWidth,
      tableY,
      tableX + halfWidth + buildingColWidth,
      tableY + tableHeight,
    );
    for (let i = 1; i <= visibleRows; i += 1) {
      const y = tableY + headerHeight + i * rowHeight;
      tableGrid.lineBetween(tableX, y, tableX + tableWidth, y);
    }

    const leftLabelX = tableX + 12;
    const leftDetailX = tableX + buildingColWidth + 14;
    const rightLabelX = tableX + halfWidth + 12;
    const rightDetailX = tableX + halfWidth + buildingColWidth + 14;
    const detailWidth = halfWidth - buildingColWidth - 28;
    const headers = [
      this.add.text(leftLabelX, tableY + 10, '建築物', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '14px',
        color: '#7ddcff',
        fontStyle: 'bold',
      }),
      this.add.text(leftDetailX, tableY + 10, 'できること / レシピ', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '14px',
        color: '#7ddcff',
        fontStyle: 'bold',
      }),
      this.add.text(rightLabelX, tableY + 10, '建築物', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '14px',
        color: '#7ddcff',
        fontStyle: 'bold',
      }),
      this.add.text(rightDetailX, tableY + 10, 'できること / レシピ', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '14px',
        color: '#7ddcff',
        fontStyle: 'bold',
      }),
    ];

    const texts: Phaser.GameObjects.Text[] = [];
    const rightColumnStart = visibleRows;
    RECIPE_ROWS.forEach((row, index) => {
      const rightColumn = index >= rightColumnStart;
      const rowIndex = rightColumn ? index - rightColumnStart : index;
      const x = rightColumn ? rightLabelX : leftLabelX;
      const detailX = rightColumn ? rightDetailX : leftDetailX;
      const y = tableY + headerHeight + 12 + rowIndex * rowHeight;
      const buildingFontSize = row.building.length >= 6 ? '12px' : '14px';
      const buildingText = this.add.text(x, y, row.building, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: buildingFontSize,
        color: '#fff3cc',
        fontStyle: 'bold',
      });
      const outputText = this.add.text(detailX, y - 2, row.output, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '13px',
        color: '#ffcf65',
        fontStyle: 'bold',
      });
      const recipeText = this.add.text(detailX, y + 19, row.recipe, {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '12px',
        color: '#dce8ef',
        wordWrap: { width: detailWidth },
      });
      texts.push(buildingText, outputText, recipeText);
    });

    const close = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.hideRecipeOverlay();
    };
    shade.on('pointerdown', close);
    board.on('pointerdown', close);
    fallbackPanel.on('pointerdown', close);
    tableBg.on('pointerdown', close);

    container.add([
      shade,
      board,
      fallbackPanel,
      tableBg,
      tableGrid,
      title,
      closeHint,
      ...headers,
      ...texts,
    ]);
    this.recipeOverlay = container;
    this.registerUiObject(container);
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

  private playTurretShotSound(): void {
    const context = this.ensureAudioContext();
    if (!context || context.state === 'suspended') {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
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
