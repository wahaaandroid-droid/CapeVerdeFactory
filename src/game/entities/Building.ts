import Phaser from 'phaser';
import {
  BUILDING_DEFS,
  BuildingType,
  Cell,
  DIRECTION_ANGLES,
  Direction,
  ItemType,
  TILE_SIZE,
} from '../types';

export class Building {
  readonly type: BuildingType;
  readonly cell: Cell;
  direction: Direction;
  hp: number;
  readonly maxHp: number;
  alive = true;
  item: ItemType | null = null;
  oreStored = 0;
  ammoStored = 0;
  nextWorkAt = 0;
  nextMoveAt = 0;
  nextFireAt = 0;

  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly directionArrow: Phaser.GameObjects.Sprite;
  private readonly itemSprite: Phaser.GameObjects.Sprite;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    type: BuildingType,
    cell: Cell,
    world: Phaser.Math.Vector2,
    direction: Direction,
  ) {
    this.type = type;
    this.cell = { ...cell };
    this.direction = direction;
    this.maxHp = BUILDING_DEFS[type].maxHp;
    this.hp = this.maxHp;

    this.container = scene.add.container(world.x, world.y).setDepth(20);
    this.sprite = scene.add
      .sprite(0, 0, `building-${type}`)
      .setOrigin(0.5)
      .setScale(1);
    this.directionArrow = scene.add
      .sprite(0, 0, 'direction-arrow')
      .setOrigin(0.5)
      .setVisible(type !== 'core' && type !== 'generator' && type !== 'turret');
    this.itemSprite = scene.add
      .sprite(0, 0, 'item-ore')
      .setOrigin(0.5)
      .setVisible(false);
    this.hpBack = scene.add
      .rectangle(-12, -TILE_SIZE / 2 - 4, 24, 3, 0x190a0a, 0.95)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.hpFill = scene.add
      .rectangle(-12, -TILE_SIZE / 2 - 4, 24, 3, 0x37e073, 1)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.container.add([
      this.sprite,
      this.directionArrow,
      this.itemSprite,
      this.hpBack,
      this.hpFill,
    ]);
    this.updateDirectionVisual();
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
    this.updateDirectionVisual();
  }

  damage(amount: number): boolean {
    if (!this.alive) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.updateHpVisual();

    if (this.hp <= 0) {
      this.alive = false;
      this.item = null;
      this.sprite.setTint(0x333333);
      this.directionArrow.setVisible(false);
      this.itemSprite.setVisible(false);
      this.container.setAlpha(0.62);
      return true;
    }

    this.container.setAlpha(1);
    return false;
  }

  repairFull(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.sprite.clearTint();
    this.container.setAlpha(1);
    this.updateHpVisual();
    this.updateDirectionVisual();
  }

  heal(amount: number): void {
    if (!this.alive) {
      this.repairFull();
      return;
    }

    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHpVisual();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  setPowered(powered: boolean): void {
    if (this.type !== 'turret') {
      return;
    }

    this.sprite.setTint(powered ? 0xffffff : 0x55606b);
  }

  setItem(item: ItemType | null): void {
    this.item = item;
    if (!item) {
      this.itemSprite.setVisible(false);
      return;
    }

    this.itemSprite.setTexture(`item-${item}`);
    this.itemSprite.setVisible(this.alive);
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  flash(color = 0xffffff): void {
    this.sprite.setTint(color);
    this.container.scene.time.delayedCall(90, () => {
      if (this.alive) {
        this.sprite.clearTint();
      }
    });
  }

  private updateDirectionVisual(): void {
    if (this.type === 'conveyor') {
      this.sprite.setAngle(DIRECTION_ANGLES[this.direction]);
    }

    if (!this.directionArrow.visible && this.type !== 'miner' && this.type !== 'ammoFactory') {
      return;
    }

    const angle = DIRECTION_ANGLES[this.direction];
    const radians = Phaser.Math.DegToRad(angle);
    this.directionArrow
      .setAngle(angle)
      .setPosition(Math.cos(radians) * 12, Math.sin(radians) * 12)
      .setVisible(this.alive && (this.type === 'miner' || this.type === 'ammoFactory'));
  }

  private updateHpVisual(): void {
    const damaged = this.hp < this.maxHp;
    this.hpBack.setVisible(damaged);
    this.hpFill.setVisible(damaged);
    this.hpFill.width = 24 * (this.hp / this.maxHp);

    if (this.hp / this.maxHp < 0.35) {
      this.hpFill.fillColor = 0xff4d3d;
    } else if (this.hp / this.maxHp < 0.7) {
      this.hpFill.fillColor = 0xffc33d;
    } else {
      this.hpFill.fillColor = 0x37e073;
    }
  }
}
