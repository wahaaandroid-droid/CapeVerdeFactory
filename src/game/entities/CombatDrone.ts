import Phaser from 'phaser';
import type { GameScene } from '../GameScene';
import { Enemy } from './Enemy';

export class CombatDrone {
  active = false;
  hp = 0;
  nextFireAt = 0;
  private readonly body: Phaser.GameObjects.Sprite;

  constructor(private readonly scene: GameScene) {
    this.body = scene.add
      .sprite(-100, -100, 'item-drone')
      .setOrigin(0.5)
      .setScale(2.4)
      .setDepth(64)
      .setVisible(false)
      .setActive(false);
    scene.registerWorldObject(this.body);
  }

  launch(x: number, y: number): void {
    this.active = true;
    this.hp = 80;
    this.nextFireAt = 0;
    this.body
      .setPosition(x, y)
      .setVisible(true)
      .setActive(true)
      .clearTint();
  }

  update(
    time: number,
    delta: number,
    target: Enemy | null,
    fire: (x: number, y: number, target: Enemy) => void,
  ): void {
    if (!this.active) {
      return;
    }

    if (!target) {
      this.body.angle += delta * 0.05;
      return;
    }

    const targetPosition = target.getWorldPosition();
    const angle = Phaser.Math.Angle.Between(
      this.body.x,
      this.body.y,
      targetPosition.x,
      targetPosition.y,
    );
    const step = (130 * delta) / 1000;
    this.body.rotation = angle;
    this.body.x += Math.cos(angle) * step;
    this.body.y += Math.sin(angle) * step;

    if (time >= this.nextFireAt) {
      this.nextFireAt = time + 520;
      fire(this.body.x, this.body.y, target);
    }

    if (
      Phaser.Math.Distance.Between(
        this.body.x,
        this.body.y,
        targetPosition.x,
        targetPosition.y,
      ) < 20
    ) {
      this.hp -= 16;
      target.damage(16);
      this.body.setTint(0xffe6a1);
    }

    if (this.hp <= 0) {
      this.deactivate(true);
    }
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.body.x, this.body.y);
  }

  deactivate(explode = false): void {
    if (explode) {
      this.scene.explosion(
        new Phaser.Math.Vector2(this.body.x, this.body.y),
        0x9de8ff,
        0.65,
      );
    }

    this.active = false;
    this.hp = 0;
    this.body.setVisible(false).setActive(false).setPosition(-100, -100);
  }
}
