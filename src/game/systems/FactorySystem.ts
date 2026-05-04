import type { GameScene } from '../GameScene';
import { Building } from '../entities/Building';
import {
  BuildingType,
  Cell,
  ConveyorVariant,
  Direction,
  DIRECTIONS,
  ItemType,
  neighbor,
} from '../types';
import { GridSystem } from './GridSystem';

const AUTO_CURVE_VARIANTS: ConveyorVariant[] = ['straight', 'curveDown', 'curveUp'];
const CURVE_VARIANTS: ConveyorVariant[] = ['curveDown', 'curveUp'];

export class FactorySystem {
  constructor(
    private readonly scene: GameScene,
    private readonly grid: GridSystem,
  ) {}

  createBuilding(
    type: BuildingType,
    cell: Cell,
    direction: Direction,
    conveyorVariant: ConveyorVariant = 'straight',
  ): Building {
    const conveyorShape =
      type === 'conveyor' && conveyorVariant === 'straight'
        ? this.autoCurveForStraight(cell, direction)
        : { direction, variant: conveyorVariant };
    const building = new Building(
      this.scene,
      type,
      cell,
      this.grid.cellToWorld(cell),
      conveyorShape.direction,
      conveyorShape.variant,
    );
    this.grid.setBuilding(cell, building);
    this.refreshAutoConveyorsAround(cell);
    return building;
  }

  moveBuilding(building: Building, cell: Cell): void {
    const oldCell = { ...building.cell };
    this.grid.clearBuilding(building.cell);
    building.moveTo(cell, this.grid.cellToWorld(cell));
    this.grid.setBuilding(cell, building);
    this.refreshAutoConveyorsAround(oldCell);
    this.refreshAutoConveyorsAround(cell);
  }

  removeBuilding(building: Building): void {
    const oldCell = { ...building.cell };
    this.grid.clearBuilding(building.cell);
    building.destroy();
    this.refreshAutoConveyorsAround(oldCell);
  }

  refreshAutoConveyorsAround(cell: Cell): void {
    for (const candidate of [cell, ...this.grid.neighbors(cell)]) {
      const building = this.grid.getBuilding(candidate);
      if (
        !building?.alive ||
        building.type !== 'conveyor' ||
        !AUTO_CURVE_VARIANTS.includes(building.conveyorVariant)
      ) {
        continue;
      }

      const desiredOutput = this.outputDirections(building)[0] ?? building.direction;
      const shape = this.autoCurveForStraight(building.cell, desiredOutput);
      building.setDirection(shape.direction);
      building.setConveyorVariant(shape.variant);
    }
  }

  update(time: number): void {
    for (const building of this.grid.allBuildings()) {
      if (!building.alive) {
        building.updateVisuals(time, this.scene.modifiers.beltIntervalMs);
        continue;
      }

      if (building.type === 'miner') {
        this.updateMiner(building, time);
      } else if (building.type === 'ammoFactory') {
        this.updateAmmoFactory(building, time);
      } else if (building.type === 'conveyor') {
        this.updateConveyor(building, time);
      }

      building.updateVisuals(time, this.scene.modifiers.beltIntervalMs);
    }
  }

  getBuildings(type?: BuildingType): Building[] {
    return this.grid
      .allBuildings()
      .filter((building) => !type || building.type === type);
  }

  ammoInNetwork(): number {
    return this.grid.allBuildings().reduce((total, building) => {
      const carried = building.item === 'ammo' ? 1 : 0;
      return total + building.ammoStored + carried;
    }, 0);
  }

  oreInNetwork(): number {
    return this.grid.allBuildings().reduce((total, building) => {
      const carried = building.item === 'ore' ? 1 : 0;
      return total + building.oreStored + carried;
    }, 0);
  }

  private updateMiner(building: Building, time: number): void {
    this.tryOutputStored(building, 'ore', time);

    if (time < building.nextWorkAt) {
      return;
    }

    const terrain = this.grid.getTerrain(building.cell);
    const speedBonus = terrain === 'resource' ? 1 : 1.8;
    building.nextWorkAt =
      time + this.scene.modifiers.productionIntervalMs * speedBonus;

    if (terrain === 'resource' && building.oreStored < this.capacity(building, 'ore')) {
      building.oreStored += 1;
      building.flash(0xcfe7f3);
      this.scene.floatText(building.getWorldPosition(), '+鉄', 0xcfe7f3);
      this.tryOutputStored(building, 'ore', time);
    }
  }

  private updateAmmoFactory(building: Building, time: number): void {
    this.tryOutputStored(building, 'ammo', time);

    if (
      building.oreStored <= 0 ||
      building.ammoStored >= this.capacity(building, 'ammo') ||
      time < building.nextWorkAt
    ) {
      return;
    }

    building.nextWorkAt = time + this.scene.modifiers.productionIntervalMs * 1.15;
    building.oreStored -= 1;
    building.ammoStored += 1;
    building.flash(0xff9d3f);
    this.scene.floatText(building.getWorldPosition(), '+弾薬', 0xffa65a);
    this.tryOutputStored(building, 'ammo', time);
  }

  private updateConveyor(building: Building, time: number): void {
    if (!building.item || time < building.nextMoveAt) {
      return;
    }

    if (this.outputItem(building, building.item)) {
      building.setItem(null);
      building.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;
    }
  }

  private tryOutputStored(
    source: Building,
    item: ItemType,
    time: number,
  ): boolean {
    if (time < source.nextMoveAt) {
      return false;
    }

    const stored = item === 'ore' ? source.oreStored : source.ammoStored;
    if (stored <= 0 || !this.outputItem(source, item)) {
      return false;
    }

    if (item === 'ore') {
      source.oreStored -= 1;
    } else {
      source.ammoStored -= 1;
    }

    source.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;
    return true;
  }

  private outputItem(source: Building, item: ItemType): boolean {
    if (source.type === 'conveyor') {
      return this.outputConveyorItem(source, item);
    }

    return this.outputToDirection(source, item, source.direction);
  }

  private outputConveyorItem(source: Building, item: ItemType): boolean {
    const outputs = this.outputDirectionsForItem(source);
    if (outputs.length <= 0) {
      return false;
    }

    const start = source.nextOutputIndex % outputs.length;
    for (let offset = 0; offset < outputs.length; offset += 1) {
      const index = (start + offset) % outputs.length;
      if (this.outputToDirection(source, item, outputs[index])) {
        source.nextOutputIndex = (index + 1) % outputs.length;
        return true;
      }
    }

    return false;
  }

  private outputDirectionsForItem(source: Building): Direction[] {
    const outputs = this.outputDirections(source);
    if (
      source.conveyorVariant !== 'junctionThree' &&
      source.conveyorVariant !== 'junctionFour'
    ) {
      return outputs;
    }

    const incoming = source.getItemInputDirection();
    if (!incoming) {
      return outputs;
    }

    return outputs.filter((direction) => direction !== incoming);
  }

  private outputToDirection(
    source: Building,
    item: ItemType,
    direction: Direction,
  ): boolean {
    const targetCell = neighbor(source.cell, direction);
    if (!this.grid.inBounds(targetCell)) {
      return false;
    }

    const target = this.grid.getBuilding(targetCell);
    if (!target) {
      return false;
    }

    return this.tryReceiveItem(target, item, this.scene.time.now, source.cell);
  }

  private tryReceiveItem(
    target: Building,
    item: ItemType,
    time: number,
    sourceCell?: Cell,
  ): boolean {
    if (!target.alive) {
      return false;
    }

    if (target.type === 'conveyor') {
      if (target.item || !this.canConveyorReceive(target, sourceCell)) {
        return false;
      }

      target.setItem(
        item,
        time,
        this.scene.modifiers.beltIntervalMs,
        sourceCell ? this.directionBetween(target.cell, sourceCell) : null,
      );
      target.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;
      return true;
    }

    if (
      (target.type === 'ammoFactory' || target.type === 'core') &&
      item === 'ore' &&
      target.oreStored < this.capacity(target, 'ore')
    ) {
      target.oreStored += 1;
      return true;
    }

    if (
      (target.type === 'turret' ||
        target.type === 'ammoFactory' ||
        target.type === 'core') &&
      item === 'ammo' &&
      target.ammoStored < this.capacity(target, 'ammo')
    ) {
      target.ammoStored += 1;
      target.flash(0x7ddcff);
      return true;
    }

    return false;
  }

  private canConveyorReceive(target: Building, sourceCell?: Cell): boolean {
    if (!sourceCell) {
      return target.conveyorVariant === 'straight';
    }

    if (target.conveyorVariant === 'straight') {
      return true;
    }

    const incoming = this.directionBetween(target.cell, sourceCell);
    return Boolean(incoming && this.inputDirections(target).includes(incoming));
  }

  private autoCurveForStraight(
    cell: Cell,
    desiredOutput: Direction,
  ): { direction: Direction; variant: ConveyorVariant } {
    const incoming = this.findIncomingSourceDirection(cell, desiredOutput);
    if (
      !incoming ||
      incoming === desiredOutput ||
      incoming === this.oppositeDirection(desiredOutput)
    ) {
      return { direction: desiredOutput, variant: 'straight' };
    }

    return this.curveShapeFor(incoming, desiredOutput) ?? {
      direction: desiredOutput,
      variant: 'straight',
    };
  }

  private findIncomingSourceDirection(
    cell: Cell,
    desiredOutput: Direction,
  ): Direction | null {
    const candidates: Direction[] = [
      this.oppositeDirection(desiredOutput),
      ...DIRECTIONS.filter((direction) => direction !== this.oppositeDirection(desiredOutput)),
    ];

    for (const incoming of candidates) {
      const sourceCell = neighbor(cell, incoming);
      const source = this.grid.getBuilding(sourceCell);
      if (!source?.alive) {
        continue;
      }

      const sourceToTarget = this.oppositeDirection(incoming);
      if (this.outputDirectionsForBuilding(source).includes(sourceToTarget)) {
        return incoming;
      }
    }

    return null;
  }

  private curveShapeFor(
    incoming: Direction,
    output: Direction,
  ): { direction: Direction; variant: ConveyorVariant } | null {
    for (const variant of CURVE_VARIANTS) {
      for (const direction of DIRECTIONS) {
        if (
          this.inputDirectionsFor(variant, direction).includes(incoming) &&
          this.outputDirectionsFor(variant, direction).includes(output)
        ) {
          return { direction, variant };
        }
      }
    }

    return null;
  }

  private inputDirections(building: Building): Direction[] {
    return this.inputDirectionsFor(building.conveyorVariant, building.direction);
  }

  private outputDirections(building: Building): Direction[] {
    return this.outputDirectionsFor(building.conveyorVariant, building.direction);
  }

  private inputDirectionsFor(
    variant: ConveyorVariant,
    direction: Direction,
  ): Direction[] {
    if (variant === 'straight') {
      return [...DIRECTIONS];
    }

    if (variant === 'junctionThree' || variant === 'junctionFour') {
      return this.connectedDirectionsFor(variant, direction);
    }

    return this.rotateDirections(['left'], direction);
  }

  private outputDirectionsFor(
    variant: ConveyorVariant,
    direction: Direction,
  ): Direction[] {
    if (variant === 'straight') {
      return [direction];
    }

    if (variant === 'junctionThree' || variant === 'junctionFour') {
      return this.connectedDirectionsFor(variant, direction);
    }

    return this.rotateDirections(
      variant === 'curveDown' ? ['down'] : ['up'],
      direction,
    );
  }

  private outputDirectionsForBuilding(building: Building): Direction[] {
    if (building.type === 'conveyor') {
      return this.outputDirections(building);
    }

    if (
      building.type === 'miner' ||
      building.type === 'ammoFactory' ||
      building.type === 'core'
    ) {
      return [building.direction];
    }

    return [];
  }

  private connectedDirectionsFor(
    variant: ConveyorVariant,
    direction: Direction,
  ): Direction[] {
    if (variant === 'junctionFour') {
      return [...DIRECTIONS];
    }

    if (variant === 'junctionThree') {
      return [direction, ...this.perpendicularDirections(direction)];
    }

    return this.outputDirectionsFor(variant, direction);
  }

  private perpendicularDirections(direction: Direction): Direction[] {
    if (direction === 'up' || direction === 'down') {
      return ['left', 'right'];
    }

    return ['up', 'down'];
  }

  private rotateDirections(directions: Direction[], facing: Direction): Direction[] {
    return directions.map((direction) => this.rotateBaseDirection(direction, facing));
  }

  private rotateBaseDirection(base: Direction, facing: Direction): Direction {
    const order: Direction[] = ['right', 'down', 'left', 'up'];
    const baseIndex = order.indexOf(base);
    const rotation = order.indexOf(facing);
    return order[(baseIndex + rotation) % order.length];
  }

  private directionBetween(from: Cell, to: Cell): Direction | null {
    if (to.x === from.x && to.y === from.y - 1) {
      return 'up';
    }
    if (to.x === from.x + 1 && to.y === from.y) {
      return 'right';
    }
    if (to.x === from.x && to.y === from.y + 1) {
      return 'down';
    }
    if (to.x === from.x - 1 && to.y === from.y) {
      return 'left';
    }
    return null;
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

  private capacity(building: Building, item: ItemType): number {
    if (building.type === 'miner') {
      return item === 'ore' ? 8 : 0;
    }

    if (building.type === 'ammoFactory') {
      return item === 'ore' ? 12 : 8;
    }

    if (building.type === 'turret') {
      return item === 'ammo' ? 36 : 0;
    }

    if (building.type === 'core') {
      return 60;
    }

    return building.type === 'conveyor' ? 1 : 0;
  }
}
