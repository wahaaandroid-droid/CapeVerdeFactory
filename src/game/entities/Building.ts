import Phaser from 'phaser';
import {
  BUILDING_DEFS,
  BuildingType,
  Cell,
  ConveyorVariant,
  DIRECTION_ANGLES,
  DIRECTIONS,
  Direction,
  ItemType,
  TILE_SIZE,
} from '../types';

export class Building {
  readonly type: BuildingType;
  cell: Cell;
  direction: Direction;
  conveyorVariant: ConveyorVariant;
  hp: number;
  readonly maxHp: number;
  alive = true;
  item: ItemType | null = null;
  oreStored = 0;
  ammoStored = 0;
  nextWorkAt = 0;
  nextMoveAt = 0;
  nextFireAt = 0;
  nextOutputIndex = 0;

  private readonly container: Phaser.GameObjects.Container;
  private readonly conveyorLinks: Phaser.GameObjects.Graphics;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly directionArrow: Phaser.GameObjects.Sprite;
  private readonly itemSprite: Phaser.GameObjects.Sprite;
  private readonly stockText: Phaser.GameObjects.Text;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private itemEnteredAt = 0;
  private itemTravelMs = 1;
  private itemInputDirection: Direction | null = null;

  constructor(
    scene: Phaser.Scene,
    type: BuildingType,
    cell: Cell,
    world: Phaser.Math.Vector2,
    direction: Direction,
    conveyorVariant: ConveyorVariant = 'straight',
  ) {
    this.type = type;
    this.cell = { ...cell };
    this.direction = direction;
    this.conveyorVariant = conveyorVariant;
    this.maxHp = BUILDING_DEFS[type].maxHp;
    this.hp = this.maxHp;

    this.container = scene.add.container(world.x, world.y).setDepth(20);
    this.registerWorld(scene, this.container);
    this.conveyorLinks = scene.add.graphics().setVisible(type === 'conveyor');
    this.sprite = scene.add
      .sprite(0, 0, this.textureKey())
      .setOrigin(0.5)
      .setScale(TILE_SIZE / 30);
    this.directionArrow = scene.add
      .sprite(0, 0, 'direction-arrow')
      .setOrigin(0.5)
      .setScale(TILE_SIZE / 30)
      .setVisible(type !== 'core' && type !== 'conveyor');
    this.itemSprite = scene.add
      .sprite(0, 0, 'item-ore')
      .setOrigin(0.5)
      .setScale(TILE_SIZE / 30)
      .setVisible(false);
    this.stockText = scene.add
      .text(0, TILE_SIZE / 2 - 14, '', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '12px',
        color: '#f5f1df',
        backgroundColor: '#05080c',
        padding: { x: 3, y: 1 },
        align: 'center',
        lineSpacing: -2,
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.hpBack = scene.add
      .rectangle(-18, -TILE_SIZE / 2 - 6, 36, 4, 0x190a0a, 0.95)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.hpFill = scene.add
      .rectangle(-18, -TILE_SIZE / 2 - 6, 36, 4, 0x37e073, 1)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.container.add([
      this.conveyorLinks,
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

  setConveyorVariant(variant: ConveyorVariant): void {
    if (this.type !== 'conveyor') {
      return;
    }

    this.conveyorVariant = variant;
    this.sprite.setTexture(this.textureKey());
    this.updateDirectionVisual();
  }

  moveTo(cell: Cell, world: Phaser.Math.Vector2): void {
    this.cell = { ...cell };
    this.container.setPosition(world.x, world.y);
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
      this.conveyorLinks.setVisible(false);
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

  setItem(
    item: ItemType | null,
    enteredAt = 0,
    travelMs = 1,
    inputDirection: Direction | null = null,
  ): void {
    this.item = item;
    this.itemEnteredAt = enteredAt;
    this.itemTravelMs = Math.max(1, travelMs);
    this.itemInputDirection = inputDirection;
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
      const position = this.itemPathPosition(progress);
      this.itemSprite.setPosition(position.x, position.y);
    } else if (this.item) {
      this.itemSprite.setPosition(0, 0);
    }

    this.updateStockVisual();
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  getItemInputDirection(): Direction | null {
    return this.itemInputDirection;
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
      this.sprite.setAngle(this.spriteAngle());
    }

    this.updateConveyorLinks();

    const angle = DIRECTION_ANGLES[this.direction];
    const radians = Phaser.Math.DegToRad(angle);
    this.directionArrow
      .setAngle(angle)
      .setPosition(Math.cos(radians) * 12, Math.sin(radians) * 12)
      .setVisible(
        this.alive &&
          this.type !== 'core' &&
          this.type !== 'conveyor' &&
          this.type !== 'turret' &&
          this.type !== 'wall',
      );
  }

  private updateConveyorLinks(): void {
    this.conveyorLinks.clear();
    this.conveyorLinks.setVisible(this.alive && this.type === 'conveyor');
    if (!this.alive || this.type !== 'conveyor') {
      return;
    }

    const directions = this.conveyorLinkDirections();
    const length = TILE_SIZE * 0.56;
    const strokes = [
      { width: 18, color: 0x080b0f, alpha: 1 },
      { width: 14, color: 0x20272e, alpha: 1 },
      { width: 8, color: 0x3b444c, alpha: 1 },
      { width: 2, color: 0xf3c53c, alpha: 0.55 },
    ];

    for (const stroke of strokes) {
      this.conveyorLinks.lineStyle(stroke.width, stroke.color, stroke.alpha);
      for (const direction of directions) {
        const point = this.directionPoint(direction, length);
        this.conveyorLinks.strokeLineShape(
          new Phaser.Geom.Line(0, 0, point.x, point.y),
        );
      }
    }

    this.conveyorLinks.fillStyle(0x20272e, 1);
    this.conveyorLinks.fillCircle(0, 0, 6);
  }

  private conveyorLinkDirections(): Direction[] {
    if (this.type !== 'conveyor') {
      return [];
    }

    if (this.conveyorVariant === 'straight') {
      return [this.oppositeDirection(this.direction), this.direction];
    }

    if (this.conveyorVariant === 'curveDown') {
      return [
        this.rotateBaseDirection('left'),
        this.rotateBaseDirection('down'),
      ];
    }

    if (this.conveyorVariant === 'curveUp') {
      return [
        this.rotateBaseDirection('left'),
        this.rotateBaseDirection('up'),
      ];
    }

    if (this.conveyorVariant === 'junctionThree') {
      return [this.direction, ...this.perpendicularDirections(this.direction)];
    }

    return [...DIRECTIONS];
  }

  private directionPoint(direction: Direction, length: number): Phaser.Math.Vector2 {
    const radians = Phaser.Math.DegToRad(DIRECTION_ANGLES[direction]);
    return new Phaser.Math.Vector2(
      Math.cos(radians) * length,
      Math.sin(radians) * length,
    );
  }

  private textureKey(): string {
    if (this.type !== 'conveyor' || this.conveyorVariant === 'straight') {
      return `building-${this.type}`;
    }

    return `conveyor-${this.conveyorVariant}`;
  }

  private spriteAngle(): number {
    if (this.type !== 'conveyor') {
      return DIRECTION_ANGLES[this.direction];
    }

    if (this.conveyorVariant === 'junctionThree') {
      return DIRECTION_ANGLES[this.direction] - 90;
    }

    return DIRECTION_ANGLES[this.direction];
  }

  private itemPathPosition(progress: number): Phaser.Math.Vector2 {
    const output = this.itemOutputDirection();
    const fallbackInput = this.oppositeDirection(output);
    const incoming =
      this.itemInputDirection && this.itemInputDirection !== output
        ? this.itemInputDirection
        : fallbackInput;
    const travel = TILE_SIZE * 0.44;
    const start = this.directionPoint(incoming, travel);
    const end = this.directionPoint(output, travel);

    if (incoming === fallbackInput) {
      return new Phaser.Math.Vector2(
        Phaser.Math.Linear(start.x, end.x, progress),
        Phaser.Math.Linear(start.y, end.y, progress),
      );
    }

    const inverse = 1 - progress;
    return new Phaser.Math.Vector2(
      inverse * inverse * start.x + progress * progress * end.x,
      inverse * inverse * start.y + progress * progress * end.y,
    );
  }

  private itemOutputDirection(): Direction {
    if (this.type !== 'conveyor') {
      return this.direction;
    }

    if (this.conveyorVariant === 'curveDown') {
      return this.rotateBaseDirection('down');
    }

    if (this.conveyorVariant === 'curveUp') {
      return this.rotateBaseDirection('up');
    }

    if (
      (this.conveyorVariant === 'junctionThree' ||
        this.conveyorVariant === 'junctionFour') &&
      this.itemInputDirection
    ) {
      const outputs = this.conveyorLinkDirections().filter(
        (direction) => direction !== this.itemInputDirection,
      );
      return outputs[this.nextOutputIndex % Math.max(1, outputs.length)] ?? this.direction;
    }

    return this.direction;
  }

  private rotateBaseDirection(base: Direction): Direction {
    const order: Direction[] = ['right', 'down', 'left', 'up'];
    const baseIndex = order.indexOf(base);
    const rotation = order.indexOf(this.direction);
    return order[(baseIndex + rotation) % order.length];
  }

  private oppositeDirection(direction: Direction): Direction {
    if (direction === 'up') {
      return 'down';
    }
    if (direction === 'right') {
      return 'left';
    }
    if (direction === 'down') {
      return 'up';
    }
    return 'right';
  }

  private perpendicularDirections(direction: Direction): Direction[] {
    if (direction === 'up' || direction === 'down') {
      return ['left', 'right'];
    }

    return ['up', 'down'];
  }

  private updateStockVisual(): void {
    const parts: string[] = [];

    if (this.oreStored > 0) {
      parts.push(`鉄${this.oreStored}`);
    }

    if (this.ammoStored > 0) {
      parts.push(`弾${this.ammoStored}`);
    }

    this.stockText.setText(parts.join('\n'));
    this.stockText.setVisible(this.alive && parts.length > 0);
  }

  private updateHpVisual(): void {
    const damaged = this.hp < this.maxHp;
    this.hpBack.setVisible(damaged);
    this.hpFill.setVisible(damaged);
    this.hpFill.width = 36 * (this.hp / this.maxHp);

    if (this.hp / this.maxHp < 0.35) {
      this.hpFill.fillColor = 0xff4d3d;
    } else if (this.hp / this.maxHp < 0.7) {
      this.hpFill.fillColor = 0xffc33d;
    } else {
      this.hpFill.fillColor = 0x37e073;
    }
  }

  private registerWorld(
    scene: Phaser.Scene,
    object: Phaser.GameObjects.GameObject,
  ): void {
    const maybeScene = scene as Phaser.Scene & {
      registerWorldObject?: (object: Phaser.GameObjects.GameObject) => void;
    };
    maybeScene.registerWorldObject?.(object);
  }
}
