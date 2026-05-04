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
    const building = new Building(
      this.scene,
      type,
      cell,
      this.grid.cellToWorld(cell),
      direction,
      conveyorVariant,
    );
    this.grid.setBuilding(cell, building);
    return building;
  }

  moveBuilding(building: Building, cell: Cell): void {
    this.grid.clearBuilding(building.cell);
    building.moveTo(cell, this.grid.cellToWorld(cell));
    this.grid.setBuilding(cell, building);
  }

  removeBuilding(building: Building): void {
    this.grid.clearBuilding(building.cell);
    building.destroy();
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
    const outputs = this.outputDirections(source);
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

      target.setItem(item, time, this.scene.modifiers.beltIntervalMs);
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
    if (target.conveyorVariant === 'straight' || !sourceCell) {
      return true;
    }

    const incoming = this.directionBetween(target.cell, sourceCell);
    return Boolean(incoming && this.inputDirections(target).includes(incoming));
  }

  private inputDirections(building: Building): Direction[] {
    if (building.conveyorVariant === 'straight') {
      return [...DIRECTIONS];
    }

    const baseInputs: Record<ConveyorVariant, Direction[]> = {
      straight: DIRECTIONS,
      curveDown: ['left'],
      curveUp: ['left'],
      splitLeftRight: ['down'],
      mergeLeftRight: ['left', 'right'],
      splitThree: ['down'],
      mergeThree: ['left', 'down', 'right'],
    };

    return this.rotateDirections(baseInputs[building.conveyorVariant], building.direction);
  }

  private outputDirections(building: Building): Direction[] {
    if (building.conveyorVariant === 'straight') {
      return [building.direction];
    }

    const baseOutputs: Record<ConveyorVariant, Direction[]> = {
      straight: ['right'],
      curveDown: ['down'],
      curveUp: ['up'],
      splitLeftRight: ['left', 'right'],
      mergeLeftRight: ['up'],
      splitThree: ['left', 'up', 'right'],
      mergeThree: ['up'],
    };

    return this.rotateDirections(baseOutputs[building.conveyorVariant], building.direction);
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
