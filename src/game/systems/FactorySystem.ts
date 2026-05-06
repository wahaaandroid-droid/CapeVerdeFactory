import type { GameScene } from '../GameScene';
import { Building } from '../entities/Building';
import {
  BuildingType,
  Cell,
  ConveyorVariant,
  Direction,
  DIRECTIONS,
  ITEM_DEFS,
  ItemType,
  neighbor,
} from '../types';
import { GridSystem } from './GridSystem';

const AUTO_CURVE_VARIANTS: ConveyorVariant[] = ['straight', 'curveDown', 'curveUp'];
const CURVE_VARIANTS: ConveyorVariant[] = ['curveDown', 'curveUp'];
const UNDERGROUND_CONVEYOR_MAX_DISTANCE = 5;
const OUTPUT_BUILDINGS: BuildingType[] = [
  'miner',
  'ammoFactory',
  'metalPlateFactory',
  'wireFactory',
  'plasticFactory',
  'fuelFactory',
  'specialAmmoFactory',
  'missileFactory',
  'droneFactory',
];

interface FactoryRecipe {
  label: string;
  inputs: Partial<Record<ItemType, number>>;
  output: ItemType;
  amount?: number;
  color: number;
}

const FACTORY_RECIPES: Partial<Record<BuildingType, FactoryRecipe[]>> = {
  ammoFactory: [
    {
      label: '弾薬',
      inputs: { ironOre: 1 },
      output: 'ammo',
      color: 0xffa65a,
    },
  ],
  metalPlateFactory: [
    {
      label: '鉄板',
      inputs: { ironOre: 1 },
      output: 'ironPlate',
      color: 0xd5e2ea,
    },
    {
      label: '銅板',
      inputs: { copperOre: 1 },
      output: 'copperPlate',
      color: 0xe99a54,
    },
  ],
  wireFactory: [
    {
      label: 'ワイヤー',
      inputs: { copperOre: 1 },
      output: 'wire',
      color: 0xf4b552,
    },
  ],
  plasticFactory: [
    {
      label: 'プラスチック',
      inputs: { oil: 1 },
      output: 'plastic',
      color: 0xe5f6ff,
    },
  ],
  fuelFactory: [
    {
      label: '燃料',
      inputs: { oil: 1 },
      output: 'fuel',
      color: 0xffc34c,
    },
  ],
  specialAmmoFactory: [
    {
      label: '強化弾',
      inputs: { ironPlate: 1, copperPlate: 1 },
      output: 'enhancedAmmo',
      color: 0xffe073,
    },
    {
      label: '焼夷弾',
      inputs: { ironPlate: 1, fuel: 1 },
      output: 'incendiaryAmmo',
      color: 0xff6834,
    },
    {
      label: 'EMP弾',
      inputs: { wire: 1, plastic: 1 },
      output: 'empAmmo',
      color: 0x68d7ff,
    },
  ],
  missileFactory: [
    {
      label: 'ミサイル',
      inputs: { ironPlate: 2, wire: 2, fuel: 4 },
      output: 'missile',
      color: 0xfff0a6,
    },
  ],
  droneFactory: [
    {
      label: 'ドローン',
      inputs: { ironPlate: 5, wire: 5, plastic: 5 },
      output: 'drone',
      color: 0x9de8ff,
    },
  ],
};

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

  setAutoConveyorOutput(building: Building, desiredOutput: Direction): void {
    if (
      building.type !== 'conveyor' ||
      !AUTO_CURVE_VARIANTS.includes(building.conveyorVariant)
    ) {
      return;
    }

    const shape = this.autoCurveForStraight(building.cell, desiredOutput);
    building.setDirection(shape.direction);
    building.setConveyorVariant(shape.variant);
    this.refreshAutoConveyorsAround(building.cell);
  }

  update(time: number): void {
    for (const building of this.grid.allBuildings()) {
      if (!building.alive) {
        building.updateVisuals(time, this.scene.modifiers.beltIntervalMs);
        continue;
      }

      if (building.type === 'miner') {
        this.updateMiner(building, time);
      } else if (FACTORY_RECIPES[building.type]) {
        this.updateFactory(building, time);
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
    return this.itemInNetwork('ammo');
  }

  oreInNetwork(): number {
    return this.itemInNetwork('ironOre');
  }

  itemInNetwork(item: ItemType): number {
    return this.grid.allBuildings().reduce((total, building) => {
      const carried = building.item === item ? 1 : 0;
      return total + building.stored(item) + carried;
    }, 0);
  }

  private updateMiner(building: Building, time: number): void {
    this.tryOutputAllStored(building, time);

    if (time < building.nextWorkAt) {
      return;
    }

    const resource = this.grid.getResource(building.cell);
    const speedBonus = resource ? 1 : 1.8;
    building.nextWorkAt =
      time + this.scene.modifiers.productionIntervalMs * speedBonus;

    if (!resource) {
      return;
    }

    const item = this.resourceItem(resource);
    if (building.canStore(item)) {
      building.addStored(item);
      building.flash(ITEM_DEFS[item].color);
      this.scene.floatText(building.getWorldPosition(), `+${ITEM_DEFS[item].label}`, ITEM_DEFS[item].color);
      this.tryOutputStored(building, item, time);
    }
  }

  private updateFactory(building: Building, time: number): void {
    this.tryOutputFactoryProducts(building, time);

    if (time < building.nextWorkAt) {
      return;
    }

    const recipes = FACTORY_RECIPES[building.type] ?? [];
    const candidates = this.rotatedRecipes(recipes, building.nextRecipeIndex);
    const recipe = candidates.find((candidate) => this.canCraft(building, candidate));
    if (!recipe) {
      return;
    }

    for (const [item, amount] of Object.entries(recipe.inputs) as [ItemType, number][]) {
      building.removeStored(item, amount);
    }

    building.addStored(recipe.output, recipe.amount ?? 1);
    building.nextRecipeIndex = (recipes.indexOf(recipe) + 1) % Math.max(1, recipes.length);
    building.nextWorkAt = time + this.scene.modifiers.productionIntervalMs * 1.15;
    building.flash(recipe.color);
    this.scene.floatText(building.getWorldPosition(), `+${recipe.label}`, recipe.color);
    this.tryOutputStored(building, recipe.output, time);
  }

  private updateConveyor(building: Building, time: number): void {
    if (!building.item) {
      return;
    }

    this.refreshConveyorItemRoute(building);

    if (time < building.nextMoveAt) {
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

    if (source.stored(item) <= 0 || !this.outputItem(source, item)) {
      return false;
    }

    source.removeStored(item);
    source.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;
    return true;
  }

  private tryOutputAllStored(source: Building, time: number): boolean {
    for (const item of source.storedItems()) {
      if (this.tryOutputStored(source, item, time)) {
        return true;
      }
    }

    return false;
  }

  private tryOutputFactoryProducts(source: Building, time: number): boolean {
    const products = this.factoryProductItems(source.type);
    if (products.size <= 0) {
      return false;
    }

    for (const item of source.storedItems()) {
      if (!products.has(item)) {
        continue;
      }

      if (this.tryOutputStored(source, item, time)) {
        return true;
      }
    }

    return false;
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

    const planned = this.pickItemOutputDirection(
      source,
      item,
      source.getItemInputDirection(),
    );
    source.setItemOutputDirection(planned);
    const candidates = this.outputCandidates(outputs, source.nextOutputIndex, planned);

    for (const direction of candidates) {
      if (this.outputToDirection(source, item, direction)) {
        const index = outputs.indexOf(direction);
        source.nextOutputIndex = ((index >= 0 ? index : 0) + 1) % outputs.length;
        return true;
      }
    }

    return false;
  }

  private outputCandidates(
    outputs: Direction[],
    startIndex: number,
    planned: Direction | null,
  ): Direction[] {
    const rotated = this.rotatedOutputDirections(outputs, startIndex);
    if (!planned || !outputs.includes(planned)) {
      return rotated;
    }

    return [planned, ...rotated.filter((direction) => direction !== planned)];
  }

  private outputDirectionsForItem(
    source: Building,
    incomingOverride: Direction | null = source.getItemInputDirection(),
  ): Direction[] {
    const outputs = this.outputDirections(source);
    if (
      source.conveyorVariant !== 'junctionThree' &&
      source.conveyorVariant !== 'junctionFour'
    ) {
      return outputs;
    }

    const incoming = incomingOverride;
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
    if (
      source.type === 'conveyor' &&
      source.conveyorVariant === 'undergroundInput'
    ) {
      return this.outputToUndergroundExit(source, item, direction);
    }

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

  private outputToUndergroundExit(
    source: Building,
    item: ItemType,
    direction: Direction,
  ): boolean {
    const exit = this.findUndergroundExit(source.cell, direction);
    if (!exit || exit.item) {
      return false;
    }

    const incoming = this.oppositeDirection(exit.direction);
    exit.setItem(
      item,
      this.scene.time.now,
      this.scene.modifiers.beltIntervalMs,
      incoming,
      this.pickItemOutputDirection(exit, item, incoming),
    );
    exit.nextMoveAt = this.scene.time.now + this.scene.modifiers.beltIntervalMs;
    exit.flash(0x7ddcff);
    return true;
  }

  private findUndergroundExit(cell: Cell, direction: Direction): Building | null {
    let cursor = { ...cell };

    for (let distance = 1; distance <= UNDERGROUND_CONVEYOR_MAX_DISTANCE; distance += 1) {
      cursor = neighbor(cursor, direction);
      if (!this.grid.inBounds(cursor)) {
        return null;
      }

      const building = this.grid.getBuilding(cursor);
      if (
        building?.alive &&
        building.type === 'conveyor' &&
        building.conveyorVariant === 'undergroundOutput' &&
        building.direction === direction
      ) {
        return building;
      }
    }

    return null;
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

      const incoming = sourceCell ? this.directionBetween(target.cell, sourceCell) : null;
      target.setItem(
        item,
        time,
        this.scene.modifiers.beltIntervalMs,
        incoming,
        this.pickItemOutputDirection(target, item, incoming),
      );
      target.nextMoveAt = time + this.scene.modifiers.beltIntervalMs;
      return true;
    }

    if (target.canStore(item)) {
      target.addStored(item);
      target.flash(0x7ddcff);
      return true;
    }

    return false;
  }

  private refreshConveyorItemRoute(source: Building): void {
    if (source.type !== 'conveyor' || !source.item) {
      return;
    }

    source.setItemOutputDirection(
      this.pickItemOutputDirection(
        source,
        source.item,
        source.getItemInputDirection(),
      ),
    );
  }

  private pickItemOutputDirection(
    source: Building,
    item: ItemType,
    incoming: Direction | null,
  ): Direction | null {
    const outputs = this.outputDirectionsForItem(source, incoming);
    if (outputs.length <= 0) {
      return null;
    }

    const candidates = this.rotatedOutputDirections(outputs, source.nextOutputIndex);
    return (
      candidates.find((direction) => this.canOutputNow(source, item, direction)) ??
      candidates[0] ??
      null
    );
  }

  private rotatedOutputDirections(
    outputs: Direction[],
    startIndex: number,
  ): Direction[] {
    if (outputs.length <= 0) {
      return [];
    }

    const start = startIndex % outputs.length;
    return outputs.map((_, offset) => outputs[(start + offset) % outputs.length]);
  }

  private canOutputNow(
    source: Building,
    item: ItemType,
    direction: Direction,
  ): boolean {
    const targetCell = neighbor(source.cell, direction);
    if (!this.grid.inBounds(targetCell)) {
      return false;
    }

    const target = this.grid.getBuilding(targetCell);
    if (!target?.alive) {
      return false;
    }

    if (target.type === 'conveyor') {
      return !target.item && this.canConveyorReceive(target, source.cell);
    }

    return target.canStore(item);
  }

  private canConveyorReceive(target: Building, sourceCell?: Cell): boolean {
    if (!sourceCell) {
      return target.conveyorVariant === 'straight';
    }

    if (target.conveyorVariant === 'straight') {
      return true;
    }

    if (target.conveyorVariant === 'undergroundOutput') {
      return false;
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

    if (variant === 'undergroundInput') {
      return [this.oppositeDirection(direction)];
    }

    if (variant === 'undergroundOutput') {
      return [];
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

    if (variant === 'undergroundInput' || variant === 'undergroundOutput') {
      return [direction];
    }

    return this.rotateDirections(
      variant === 'curveDown' ? ['down'] : ['up'],
      direction,
    );
  }

  private outputDirectionsForBuilding(building: Building): Direction[] {
    if (building.type === 'conveyor') {
      if (building.conveyorVariant === 'undergroundInput') {
        return [];
      }

      return this.outputDirections(building);
    }

    if (OUTPUT_BUILDINGS.includes(building.type)) {
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

  private rotatedRecipes(
    recipes: FactoryRecipe[],
    startIndex: number,
  ): FactoryRecipe[] {
    if (recipes.length <= 0) {
      return [];
    }

    const start = startIndex % recipes.length;
    return recipes.map((_, offset) => recipes[(start + offset) % recipes.length]);
  }

  private canCraft(building: Building, recipe: FactoryRecipe): boolean {
    if (!building.canStore(recipe.output, recipe.amount ?? 1)) {
      return false;
    }

    return (Object.entries(recipe.inputs) as [ItemType, number][]).every(
      ([item, amount]) => building.stored(item) >= amount,
    );
  }

  private factoryProductItems(type: BuildingType): Set<ItemType> {
    const recipes = FACTORY_RECIPES[type] ?? [];
    return new Set(recipes.map((recipe) => recipe.output));
  }

  private resourceItem(resource: 'iron' | 'copper' | 'oil'): ItemType {
    if (resource === 'copper') {
      return 'copperOre';
    }

    if (resource === 'oil') {
      return 'oil';
    }

    return 'ironOre';
  }
}
