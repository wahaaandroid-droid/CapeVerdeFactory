import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Bullet {
  active = false;
  private target: Enemy | null = null;
  private targetPosition: Phaser.Math.Vector2 | null = null;
  private damage = 0;
  private speed = 360;
  private color = 0xffcf65;
  private onHit: ((target: Enemy | null, position: Phaser.Math.Vector2) => void) | null = null;
  private readonly body: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.body = scene.add
      .rectangle(-100, -100, 11, 5, 0xffcf65, 1)
      .setDepth(60)
      .setActive(false)
      .setVisible(false);
    const maybeScene = scene as Phaser.Scene & {
      registerWorldObject?: (object: Phaser.GameObjects.GameObject) => void;
    };
    maybeScene.registerWorldObject?.(this.body);
  }

  fire(
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    color = 0xffcf65,
    onHit: ((target: Enemy | null, position: Phaser.Math.Vector2) => void) | null = null,
  ): void {
    this.active = true;
    this.target = target;
    this.targetPosition = target.getWorldPosition();
    this.damage = damage;
    this.color = color;
    this.onHit = onHit;
    this.body
      .setPosition(x, y)
      .setFillStyle(color, 1)
      .setActive(true)
      .setVisible(true);
  }

  update(delta: number): boolean {
    if (!this.active) {
      this.deactivate();
      return false;
    }

    if (this.target?.active) {
      this.targetPosition = this.target.getWorldPosition();
    }

    if (!this.targetPosition) {
      this.deactivate();
      return false;
    }

    const angle = Phaser.Math.Angle.Between(
      this.body.x,
      this.body.y,
      this.targetPosition.x,
      this.targetPosition.y,
    );
    this.body.rotation = angle;

    const distance = Phaser.Math.Distance.Between(
      this.body.x,
      this.body.y,
      this.targetPosition.x,
      this.targetPosition.y,
    );
    const step = (this.speed * delta) / 1000;

    if (distance <= step + 4) {
      const hitTarget = this.target?.active ? this.target : null;
      const hitPosition = this.targetPosition.clone();
      if (this.onHit) {
        this.onHit(hitTarget, hitPosition);
      } else if (hitTarget) {
        hitTarget.damage(this.damage);
      }
      this.scene.events.emit('bullet-hit', hitPosition.x, hitPosition.y, this.color);
      this.deactivate();
      return true;
    }

    this.body.x += Math.cos(angle) * step;
    this.body.y += Math.sin(angle) * step;
    return false;
  }

  deactivate(): void {
    this.active = false;
    this.target = null;
    this.targetPosition = null;
    this.onHit = null;
    this.body.setActive(false).setVisible(false).setPosition(-100, -100);
  }
}
