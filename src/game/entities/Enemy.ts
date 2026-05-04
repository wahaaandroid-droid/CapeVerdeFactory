import Phaser from 'phaser';
import type { GameScene } from '../GameScene';
import { Building } from './Building';
import {
  Cell,
  ENEMY_DEFS,
  EnemyType,
  sameCell,
} from '../types';

export class Enemy {
  active = false;
  type: EnemyType = 'small';
  cell: Cell = { x: 0, y: 0 };
  private targetCell: Cell | null = null;
  private targetPoint: Phaser.Math.Vector2 | null = null;
  private attackTarget: Building | null = null;
  private hp = 1;
  private maxHp = 1;
  private speed = 40;
  private damageValue = 10;
  private reward = 10;
  private nextAttackAt = 0;
  private stunnedUntil = 0;

  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: GameScene) {
    this.container = scene.add.container(-100, -100).setDepth(45).setVisible(false);
    this.scene.registerWorldObject(this.container);
    this.body = scene.add.sprite(0, 0, 'enemy-small').setOrigin(0.5).setScale(1.35);
    this.hpBack = scene.add
      .rectangle(-16, -24, 32, 4, 0x160707, 0.95)
      .setOrigin(0, 0.5);
    this.hpFill = scene.add
      .rectangle(-16, -24, 32, 4, 0x73f083, 1)
      .setOrigin(0, 0.5);
    this.container.add([this.body, this.hpBack, this.hpFill]);
  }

  spawn(type: EnemyType, cell: Cell, wave: number): void {
    const definition = ENEMY_DEFS[type];
    const world = this.scene.grid.cellToWorld(cell);
    const waveScale = 1 + (wave - 1) * 0.18;

    this.active = true;
    this.type = type;
    this.cell = { ...cell };
    this.targetCell = null;
    this.targetPoint = null;
    this.attackTarget = null;
    this.maxHp = Math.round(definition.maxHp * waveScale);
    this.hp = this.maxHp;
    this.speed = definition.speed * (1 + wave * 0.015);
    this.damageValue = Math.round(definition.damage * (1 + wave * 0.12));
    this.reward = Math.round(definition.reward * waveScale);
    this.nextAttackAt = 0;
    this.stunnedUntil = 0;

    this.body.setTexture(`enemy-${type}`).clearTint();
    this.container.setPosition(world.x, world.y).setVisible(true).setAlpha(1);
    this.updateHpBar();
  }

  update(time: number, delta: number): void {
    if (!this.active) {
      return;
    }

    if (time < this.stunnedUntil) {
      this.body.setTint(Math.floor(time / 160) % 2 === 0 ? 0x67d9ff : 0xe8fbff);
      return;
    }

    if (this.stunnedUntil > 0) {
      this.stunnedUntil = 0;
      this.body.clearTint();
    }

    if (this.attackTarget) {
      if (!this.attackTarget.alive) {
        this.attackTarget = null;
      } else {
        this.attack(time);
        return;
      }
    }

    if (!this.targetCell || !this.targetPoint) {
      this.chooseNextTarget();
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.container.x,
      this.container.y,
      this.targetPoint.x,
      this.targetPoint.y,
    );
    const step = (this.speed * delta) / 1000;

    if (distance <= step) {
      this.container.setPosition(this.targetPoint.x, this.targetPoint.y);
      this.cell = { ...this.targetCell };
      this.targetCell = null;
      this.targetPoint = null;
      this.chooseNextTarget();
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      this.container.x,
      this.container.y,
      this.targetPoint.x,
      this.targetPoint.y,
    );
    this.container.x += Math.cos(angle) * step;
    this.container.y += Math.sin(angle) * step;
  }

  damage(amount: number): void {
    if (!this.active) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.body.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        this.body.clearTint();
      }
    });
    this.updateHpBar();

    if (this.hp <= 0) {
      this.active = false;
      this.container.setVisible(false).setPosition(-100, -100);
      this.scene.onEnemyKilled(this.reward, this.getWorldPosition());
    }
  }

  stun(durationMs: number): void {
    if (!this.active) {
      return;
    }

    this.stunnedUntil = Math.max(this.stunnedUntil, this.scene.time.now + durationMs);
    this.body.setTint(0x67d9ff);
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  private chooseNextTarget(): void {
    const core = this.scene.core;
    if (sameCell(this.cell, core.cell)) {
      this.attackTarget = core;
      return;
    }

    const next = this.scene.grid.bestEnemyStep(this.cell, core.cell);
    if (!next) {
      return;
    }

    const building = this.scene.grid.getBuilding(next);
    if (building?.alive) {
      this.attackTarget = building;
      this.targetCell = null;
      this.targetPoint = null;
      return;
    }

    this.targetCell = next;
    this.targetPoint = this.scene.grid.cellToWorld(next);
  }

  private attack(time: number): void {
    if (!this.attackTarget || time < this.nextAttackAt) {
      return;
    }

    this.nextAttackAt = time + (this.type === 'small' ? 750 : 980);

    if (this.type === 'suicide') {
      this.scene.damageBuildingArea(this.attackTarget.cell, this.damageValue);
      this.scene.explosion(this.getWorldPosition(), 0xff6b1a);
      this.active = false;
      this.container.setVisible(false).setPosition(-100, -100);
      return;
    }

    this.scene.damageBuilding(this.attackTarget, this.damageValue);
  }

  private updateHpBar(): void {
    const ratio = this.hp / this.maxHp;
    this.hpFill.width = 32 * ratio;

    if (ratio < 0.35) {
      this.hpFill.fillColor = 0xff4d3d;
    } else if (ratio < 0.7) {
      this.hpFill.fillColor = 0xffc83d;
    } else {
      this.hpFill.fillColor = 0x73f083;
    }
  }
}
