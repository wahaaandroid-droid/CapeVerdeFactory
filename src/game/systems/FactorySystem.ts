import type { GameScene } from '../GameScene';
import { Building } from '../entities/Building';
import {
  BuildingType,
  Cell,
  Direction,
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
  ): Building {
    const building = new Building(
      this.scene,
      type,
      cell,
      this.grid.cellToWorld(cell),
      direction,
    );
    this.grid.setBuilding(cell, building);
    return building;
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
    const targetCell = neighbor(source.cell, source.direction);
    if (!this.grid.inBounds(targetCell)) {
      return false;
    }

    const target = this.grid.getBuilding(targetCell);
    if (!target) {
      return false;
    }

    return this.tryReceiveItem(target, item, this.scene.time.now);
  }

  private tryReceiveItem(target: Building, item: ItemType, time: number): boolean {
    if (!target.alive) {
      return false;
    }

    if (target.type === 'conveyor') {
      if (target.item) {
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
