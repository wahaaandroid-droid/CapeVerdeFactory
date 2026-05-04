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
  private readonly stockText: Phaser.GameObjects.Text;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private itemEnteredAt = 0;
  private itemTravelMs = 1;

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
      .setVisible(type !== 'core' && type !== 'conveyor');
    this.itemSprite = scene.add
      .sprite(0, 0, 'item-ore')
      .setOrigin(0.5)
      .setVisible(false);
    this.stockText = scene.add
      .text(0, TILE_SIZE / 2 + 2, '', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '8px',
        color: '#f5f1df',
        backgroundColor: '#111820',
        padding: { x: 1, y: 0 },
      })
      .setOrigin(0.5, 0)
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
      this.stockText,
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
      this.oreStored = 0;
      this.ammoStored = 0;
      this.sprite.setTint(0x333333);
      this.directionArrow.setVisible(false);
      this.itemSprite.setVisible(false);
      this.stockText.setVisible(false);
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

  setItem(item: ItemType | null, enteredAt = 0, travelMs = 1): void {
    this.item = item;
    this.itemEnteredAt = enteredAt;
    this.itemTravelMs = Math.max(1, travelMs);
    if (!item) {
      this.itemSprite.setVisible(false);
      return;
    }

    this.itemSprite.setTexture(`item-${item}`);
    this.itemSprite.setVisible(this.alive);
  }

  updateVisuals(time: number, beltIntervalMs: number): void {
    if (this.item && this.type === 'conveyor') {
      const progress = Phaser.Math.Clamp(
        (time - this.itemEnteredAt) / Math.max(1, this.itemTravelMs || beltIntervalMs),
        0,
        1,
      );
      const angle = Phaser.Math.DegToRad(DIRECTION_ANGLES[this.direction]);
      const distance = Phaser.Math.Linear(-10, 10, progress);
      this.itemSprite.setPosition(Math.cos(angle) * distance, Math.sin(angle) * distance);
    } else if (this.item) {
      this.itemSprite.setPosition(0, 0);
    }

    this.updateStockVisual();
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
    if (this.type === 'conveyor' || this.type === 'turret') {
      this.sprite.setAngle(DIRECTION_ANGLES[this.direction]);
    }

    const angle = DIRECTION_ANGLES[this.direction];
    const radians = Phaser.Math.DegToRad(angle);
    this.directionArrow
      .setAngle(angle)
      .setPosition(Math.cos(radians) * 12, Math.sin(radians) * 12)
      .setVisible(
        this.alive &&
          this.type !== 'core' &&
          this.type !== 'conveyor' &&
          this.type !== 'turret',
      );
  }

  private updateStockVisual(): void {
    const parts: string[] = [];

    if (this.oreStored > 0) {
      parts.push(`鉄${this.oreStored}`);
    }

    if (this.ammoStored > 0) {
      parts.push(`弾${this.ammoStored}`);
    }

    this.stockText.setText(parts.join(' '));
    this.stockText.setVisible(this.alive && parts.length > 0);
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
