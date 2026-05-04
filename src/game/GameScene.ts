import Phaser from 'phaser';
import splashUrl from '../../assets/images/splash.jpg';
import { Bullet } from './entities/Bullet';
import { Building } from './entities/Building';
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
  DIRECTION_ANGLES,
  Direction,
  EnemyType,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  TILE_SIZE,
  UpgradeId,
  manhattan,
  rotateDirection,
} from './types';

type BuildableType = Exclude<BuildingType, 'core'>;

const BUILD_ORDER: BuildableType[] = [
  'miner',
  'conveyor',
  'ammoFactory',
  'turret',
];

type InteractionMode = 'build' | 'rotate';

interface BuildButton {
  type: BuildableType;
  box: Phaser.GameObjects.Rectangle;
}

export class GameScene extends Phaser.Scene {
  grid!: GridSystem;
  factory!: FactorySystem;
  wave!: WaveSystem;
  upgrades!: UpgradeSystem;
  core!: Building;
  parts = 360;
  modifiers = {
    turretDamage: 34,
    turretRange: 125,
    beltIntervalMs: 520,
    productionIntervalMs: 1650,
  };

  private selectedBuild: BuildableType = 'conveyor';
  private direction: Direction = 'right';
  private mode: InteractionMode = 'build';
  private readonly enemies: Enemy[] = [];
  private readonly bullets: Bullet[] = [];
  private preview!: Phaser.GameObjects.Graphics;
  private buildButtons: BuildButton[] = [];
  private gameEnded = false;
  private statusMessage = '準備フェーズでラインを組み、準備完了で戦闘開始';
  private statusUntil = 0;
  private ui!: {
    wave: Phaser.GameObjects.Text;
    phase: Phaser.GameObjects.Text;
    core: Phaser.GameObjects.Text;
    parts: Phaser.GameObjects.Text;
    ore: Phaser.GameObjects.Text;
    ammo: Phaser.GameObjects.Text;
    selected: Phaser.GameObjects.Text;
    status: Phaser.GameObjects.Text;
    readyButton: Phaser.GameObjects.Rectangle;
    readyText: Phaser.GameObjects.Text;
    modeButton: Phaser.GameObjects.Rectangle;
    modeText: Phaser.GameObjects.Text;
  };

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image('splash', splashUrl);
  }

  create(): void {
    createPixelTextures(this);
    this.createBackdrop();

    this.grid = new GridSystem();
    this.grid.render(this);
    this.factory = new FactorySystem(this, this.grid);
    this.wave = new WaveSystem(this);
    this.upgrades = new UpgradeSystem(this);
    this.preview = this.add.graphics().setDepth(85);

    this.createPools();
    this.createStarterBase();
    this.createUi();
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
    this.enemies.forEach((enemy) => enemy.update(time, delta));
    this.bullets.forEach((bullet) => bullet.update(delta));
    this.wave.update(time);
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

  private createBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x061019, 1).setOrigin(0);
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
    this.core = this.factory.createBuilding('core', { x: 10, y: 10 }, 'up');
    this.factory.createBuilding('miner', { x: 4, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 5, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 6, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 7, y: 8 }, 'right');
    const ammoFactory = this.factory.createBuilding('ammoFactory', { x: 8, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 9, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 10, y: 8 }, 'right');
    this.factory.createBuilding('conveyor', { x: 11, y: 8 }, 'down');
    this.factory.createBuilding('conveyor', { x: 11, y: 9 }, 'down');
    this.factory.createBuilding('conveyor', { x: 11, y: 10 }, 'right');
    this.factory.createBuilding('conveyor', { x: 12, y: 10 }, 'right');
    const turret = this.factory.createBuilding('turret', { x: 13, y: 10 }, 'left');

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
  }

  private createInput(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameEnded || this.wave.state === 'upgrade') {
        return;
      }

      if (pointer.rightButtonDown()) {
        this.mode = 'build';
        this.setStatus('建設モード');
        return;
      }

      if (pointer.leftButtonDown()) {
        if (this.mode === 'rotate') {
          this.tryRotateExisting(pointer);
        } else {
          this.tryPlace(pointer);
        }
      }
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        this.direction = rotateDirection(this.direction);
        this.setStatus(`向き: ${this.directionLabel(this.direction)}`, 900);
      }

      if (event.key.toLowerCase() === 'q') {
        this.toggleMode();
      }

      const number = Number(event.key);
      if (number >= 1 && number <= BUILD_ORDER.length) {
        this.selectBuild(BUILD_ORDER[number - 1]);
      }
    });
  }

  private createHitEvents(): void {
    this.events.on('bullet-hit', (x: number, y: number) => {
      const flash = this.add.circle(x, y, 5, 0xffd873, 0.9).setDepth(65);
      this.tweens.add({
        targets: flash,
        scale: 1.9,
        alpha: 0,
        duration: 130,
        onComplete: () => flash.destroy(),
      });
    });
  }

  private createUi(): void {
    this.drawPanel(8, 8, 224, 228, '防衛状況');
    const readyButton = this.add
      .rectangle(118, 207, 178, 34, 0x1f4c3a, 1)
      .setStrokeStyle(2, 0x79f0a4, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const readyText = this.add
      .text(118, 207, '準備完了', {
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
        if (this.wave.state === 'preparation') {
          this.wave.startCombat();
        }
      },
    );

    const modeButton = this.add
      .rectangle(118, 430, 178, 34, 0x243340, 1)
      .setStrokeStyle(2, 0x7ddcff, 1)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    const modeText = this.add
      .text(118, 430, '向き変更モード', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    modeButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.toggleMode();
      },
    );

    this.ui = {
      wave: this.addText(24, 36, '', 21, '#fff3cc', true),
      phase: this.addText(24, 70, '', 18, '#e6eef4'),
      core: this.addText(24, 108, '', 18, '#7fdcff'),
      parts: this.addText(24, 142, '', 17, '#d6e3eb'),
      ore: this.addText(24, 168, '', 17, '#d6e3eb'),
      ammo: this.addText(118, 168, '', 17, '#ffb174'),
      selected: this.addText(274, 708, '', 15, '#e6eef4'),
      status: this.addText(274, 734, this.statusMessage, 15, '#fff0c4'),
      readyButton,
      readyText,
      modeButton,
      modeText,
    };

    this.drawPanel(8, 248, 224, 206, '建設メニュー');
    this.createBuildMenu();

    this.drawPanel(870, 8, 300, 280, '舞台設定');
    this.add
      .image(1020, 114, 'splash')
      .setDisplaySize(258, 145)
      .setDepth(91);
    this.addText(
      890,
      206,
      '火山島の地熱採掘基地。\n青いコアを維持し、海から来る\nドローンを10ウェーブ撃退。',
      15,
      '#d6e3eb',
    );

    this.drawPanel(870, 306, 300, 176, '敵ユニット');
    this.drawEnemyLegend();

    this.drawPanel(870, 500, 300, 188, 'ミニマップ');
    this.drawMiniMap();

    this.drawPanel(248, 654, 608, 96, '操作ライン');
    this.updateUi(this.time.now);
  }

  private createBuildMenu(): void {
    BUILD_ORDER.forEach((type, index) => {
      const definition = BUILDING_DEFS[type];
      const x = 26 + (index % 2) * 100;
      const y = 270 + Math.floor(index / 2) * 40;
      const box = this.add
        .rectangle(x + 40, y + 14, 86, 32, 0x151a20, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, type === this.selectedBuild ? 0xffd16a : 0x55606a, 1)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      const icon = this.add
        .sprite(x + 10, y + 14, `building-${type}`)
        .setDisplaySize(24, 24)
        .setDepth(101);
      const label = this.addText(
        x + 26,
        y + 5,
        `${definition.label}\n${definition.cost}`,
        11,
        '#e8edf2',
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
          this.selectBuild(type);
        },
      );
      box.on('pointerover', () => box.setFillStyle(0x22303a, 1));
      box.on('pointerout', () => box.setFillStyle(0x151a20, 1));

      this.buildButtons.push({ type, box });
    });
  }

  private drawEnemyLegend(): void {
    const entries: [EnemyType, string][] = [
      ['small', '小型'],
      ['heavy', '重装'],
      ['suicide', '自爆'],
    ];

    entries.forEach(([type, label], index) => {
      const x = 915 + index * 86;
      this.add.sprite(x, 374, `enemy-${type}`).setDepth(101).setScale(1.4);
      this.addText(x - 24, 414, label, 15, '#e8edf2');
    });
  }

  private drawMiniMap(): void {
    const originX = 900;
    const originY = 544;
    const size = 6;
    const graphics = this.add.graphics().setDepth(101);

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const terrain = this.grid.getTerrain({ x, y });
        const color =
          terrain === 'lava'
            ? 0xff4d22
            : terrain === 'ocean'
              ? 0x1688a5
              : terrain === 'resource'
                ? 0xb8c5ce
                : terrain === 'geothermal'
                  ? 0x34cfff
                  : 0x475047;
        graphics.fillStyle(color, 1);
        graphics.fillRect(originX + x * size, originY + y * size, size - 1, size - 1);
      }
    }

    graphics.fillStyle(0x38d6ff, 1);
    graphics.fillRect(originX + 10 * size, originY + 10 * size, size, size);
  }

  private updateTurrets(time: number): void {
    const turrets = this.factory.getBuildings('turret');

    for (const turret of turrets) {
      if (
        !turret.alive ||
        turret.ammoStored <= 0 ||
        time < turret.nextFireAt
      ) {
        continue;
      }

      const target = this.findNearestEnemy(
        turret.getWorldPosition(),
        this.modifiers.turretRange,
      );

      if (!target) {
        continue;
      }

      turret.nextFireAt = time + 560;
      turret.ammoStored -= 1;
      turret.flash(0xffe0a3);
      const bullet = this.bullets.find((candidate) => !candidate.active) ?? this.addBullet();
      const position = turret.getWorldPosition();
      bullet.fire(position.x, position.y, target, this.modifiers.turretDamage);
    }
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

    const cell = this.grid.worldToCell(pointer.x, pointer.y);
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

    if (this.selectedBuild === 'miner' && this.grid.getTerrain(cell) !== 'resource') {
      this.setStatus('採掘機は資源ノードに設置');
      return;
    }

    const cost = BUILDING_DEFS[this.selectedBuild].cost;
    if (this.parts < cost) {
      this.setStatus('建材が不足');
      return;
    }

    if (existing && !existing.alive) {
      this.factory.removeBuilding(existing);
    }

    this.parts -= cost;
    this.factory.createBuilding(this.selectedBuild, cell, this.direction);
    this.setStatus(`${BUILDING_DEFS[this.selectedBuild].label}を建設`);
  }

  private tryRotateExisting(pointer: Phaser.Input.Pointer): void {
    if (this.wave.state !== 'preparation') {
      this.setStatus('戦闘中は向きを変更できません');
      return;
    }

    const cell = this.grid.worldToCell(pointer.x, pointer.y);
    if (!cell) {
      return;
    }

    const building = this.grid.getBuilding(cell);
    if (!building?.alive || building.type === 'core') {
      this.setStatus('向きを変える施設をクリック');
      return;
    }

    building.setDirection(rotateDirection(building.direction));
    this.direction = building.direction;
    this.setStatus(`${BUILDING_DEFS[building.type].label}の向き: ${this.directionLabel(building.direction)}`);
  }

  private selectBuild(type: BuildableType): void {
    this.selectedBuild = type;
    this.mode = 'build';
    this.setStatus(`${BUILDING_DEFS[type].label}を選択`, 900);
    this.buildButtons.forEach(({ type: buttonType, box }) => {
      box.setStrokeStyle(2, buttonType === type ? 0xffd16a : 0x55606a, 1);
    });
  }

  private toggleMode(): void {
    this.mode = this.mode === 'build' ? 'rotate' : 'build';
    this.setStatus(this.mode === 'build' ? '建設モード' : '向き変更モード');
  }

  private updatePreview(): void {
    this.preview.clear();
    if (this.gameEnded || this.wave.state === 'upgrade') {
      return;
    }

    const pointer = this.input.activePointer;
    const cell = this.grid.worldToCell(pointer.x, pointer.y);
    if (!cell) {
      return;
    }

    const x = MAP_ORIGIN_X + cell.x * TILE_SIZE;
    const y = MAP_ORIGIN_Y + cell.y * TILE_SIZE;

    if (this.mode === 'rotate') {
      const building = this.grid.getBuilding(cell);
      const valid =
        this.wave.state === 'preparation' &&
        Boolean(building?.alive) &&
        building?.type !== 'core';
      this.preview.lineStyle(2, valid ? 0x7ddcff : 0xff4d3d, 0.95);
      this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      return;
    }

    const valid =
      this.wave.state === 'preparation' &&
      this.grid.isBuildable(cell) &&
      !this.grid.getBuilding(cell)?.alive &&
      (this.selectedBuild !== 'miner' || this.grid.getTerrain(cell) === 'resource') &&
      this.parts >= BUILDING_DEFS[this.selectedBuild].cost;
    this.preview.lineStyle(2, valid ? 0x7dff9f : 0xff4d3d, 0.95);
    this.preview.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    this.preview.fillStyle(0xf5c331, 0.75);
    const centerX = x + TILE_SIZE / 2;
    const centerY = y + TILE_SIZE / 2;
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
    this.ui.ore.setText(`鉄 ${this.factory.oreInNetwork()}`);
    this.ui.ammo.setText(`弾 ${this.factory.ammoInNetwork()}`);
    this.ui.selected.setText(
      `モード: ${this.mode === 'build' ? '建設' : '向き変更'}  選択: ${BUILDING_DEFS[this.selectedBuild].label}  向き: ${this.directionLabel(
        this.direction,
      )}  Rで向き / Qでモード`,
    );
    this.ui.readyButton
      .setFillStyle(this.wave.state === 'preparation' ? 0x1f4c3a : 0x24303a, 1)
      .setStrokeStyle(2, this.wave.state === 'preparation' ? 0x79f0a4 : 0x57606a, 1);
    this.ui.readyText.setAlpha(this.wave.state === 'preparation' ? 1 : 0.45);
    this.ui.modeButton
      .setFillStyle(this.mode === 'rotate' ? 0x31506a : 0x243340, 1)
      .setStrokeStyle(2, this.mode === 'rotate' ? 0xffd16a : 0x7ddcff, 1);
    this.ui.modeText.setText(this.mode === 'build' ? '向き変更モード' : '建設モード');

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
}
