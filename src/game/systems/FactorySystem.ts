import type { GameScene } from '../GameScene';
import { Building } from '../entities/Building';
import {
  BUILDING_DEFS,
  BuildingType,
  Cell,
  Direction,
  ItemType,
  manhattan,
  neighbor,
} from '../types';
import { GridSystem } from './GridSystem';

export class FactorySystem {
  powerProduced = 0;
  powerUsed = 0;

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
    this.recomputePower();

    for (const building of this.grid.allBuildings()) {
      if (!building.alive) {
        continue;
      }

      if (building.type === 'miner') {
        this.updateMiner(building, time);
      } else if (building.type === 'ammoFactory') {
        this.updateAmmoFactory(building, time);
      } else if (building.type === 'conveyor') {
        this.updateConveyor(building, time);
      } else if (building.type === 'turret') {
        building.setPowered(this.isPowered(building.cell));
      }
    }
  }

  isPowered(cell: Cell): boolean {
    return this.grid
      .allBuildings()
      .some(
        (building) =>
          building.type === 'generator' &&
          building.alive &&
          manhattan(building.cell, cell) <= this.generatorRadius(building),
      );
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
    if (time < building.nextWorkAt) {
      return;
    }

    const terrain = this.grid.getTerrain(building.cell);
    const speedBonus = terrain === 'resource' ? 1 : 1.8;
    building.nextWorkAt =
      time + this.scene.modifiers.productionIntervalMs * speedBonus;

    if (terrain === 'resource') {
      this.scene.metal += 8;
      this.scene.floatText(building.getWorldPosition(), '+鉄', 0xcfe7f3);
      this.outputItem(building, 'ore');
    }
  }

  private updateAmmoFactory(building: Building, time: number): void {
    if (building.ammoStored > 0 && this.outputItem(building, 'ammo')) {
      building.ammoStored -= 1;
    }

    if (building.oreStored <= 0 || time < building.nextWorkAt) {
      return;
    }

    building.nextWorkAt = time + this.scene.modifiers.productionIntervalMs * 1.15;
    building.oreStored -= 1;
    building.ammoStored += 1;
    building.flash(0xff9d3f);
    this.scene.floatText(building.getWorldPosition(), '+弾薬', 0xffa65a);
  }

  private updateConveyor(building: Building, time: number): void {
    if (!building.item || time < building.nextMoveAt) {
      return;
    }

    building.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;

    if (this.outputItem(building, building.item)) {
      building.setItem(null);
    }
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

    return this.tryReceiveItem(target, item);
  }

  private tryReceiveItem(target: Building, item: ItemType): boolean {
    if (!target.alive) {
      return false;
    }

    if (target.type === 'conveyor') {
      if (target.item) {
        return false;
      }

      target.setItem(item);
      return true;
    }

    if (target.type === 'ammoFactory' && item === 'ore' && target.oreStored < 10) {
      target.oreStored += 1;
      return true;
    }

    if (target.type === 'turret' && item === 'ammo' && target.ammoStored < 40) {
      target.ammoStored += 1;
      target.flash(0x7ddcff);
      return true;
    }

    if (target.type === 'core') {
      this.scene.collectItem(item);
      return true;
    }

    return false;
  }

  private recomputePower(): void {
    let produced = 0;
    let used = 0;

    for (const building of this.grid.allBuildings()) {
      if (!building.alive) {
        continue;
      }

      if (building.type === 'generator') {
        produced += this.grid.getTerrain(building.cell) === 'geothermal' ? 160 : 100;
      }

      if (building.type === 'turret') {
        used += 30;
      }
    }

    this.powerProduced = produced;
    this.powerUsed = used;
  }

  private generatorRadius(generator: Building): number {
    return this.grid.getTerrain(generator.cell) === 'geothermal' ? 7 : 5;
  }
}
