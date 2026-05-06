import type { GameScene } from '../GameScene';
import { Cell, EnemyType } from '../types';

type WaveState = 'preparation' | 'combat' | 'upgrade' | 'finished' | 'stopped';

export interface SpawnPlan {
  type: EnemyType;
  cell: Cell;
}

export class WaveSystem {
  readonly maxWave = 10;
  wave = 0;
  state: WaveState = 'preparation';
  private nextSpawnAt = 0;
  private spawnQueue: SpawnPlan[] = [];

  constructor(private readonly scene: GameScene) {}

  startPreparation(): void {
    if (this.wave >= this.maxWave) {
      this.state = 'finished';
      return;
    }

    this.state = 'preparation';
    this.spawnQueue = [];
    this.scene.setStatus(`準備フェーズ: ${this.scene.nextWaveSummary()}`);
  }

  startCombat(): void {
    if (this.state !== 'preparation' || this.wave >= this.maxWave) {
      return;
    }

    this.beginWave();
  }

  update(time: number): void {
    if (this.state !== 'combat') {
      return;
    }

    if (this.spawnQueue.length > 0 && time >= this.nextSpawnAt) {
      const plan = this.spawnQueue.shift();
      if (plan) {
        this.scene.spawnEnemy(plan.type, this.wave, plan.cell);
      }
      this.nextSpawnAt = time + Math.max(360, 850 - this.wave * 35);
    }

    if (this.spawnQueue.length === 0 && !this.scene.hasActiveEnemies()) {
      this.finishWave();
    }
  }

  stop(): void {
    this.state = 'stopped';
    this.spawnQueue = [];
  }

  previewNextWave(): SpawnPlan[] {
    if (this.wave >= this.maxWave) {
      return [];
    }

    return this.buildWave(this.wave + 1);
  }

  private beginWave(): void {
    this.wave += 1;
    this.state = 'combat';
    this.spawnQueue = this.buildWave(this.wave);
    this.nextSpawnAt = this.scene.time.now + 400;
    this.scene.setStatus(`戦闘フェーズ: ウェーブ${this.wave}開始`);
  }

  private finishWave(): void {
    if (this.wave >= this.maxWave) {
      this.state = 'finished';
      this.scene.winGame();
      return;
    }

    this.state = 'upgrade';
    this.scene.onWaveCleared(this.wave);
    this.scene.upgrades.show();
  }

  private buildWave(wave: number): SpawnPlan[] {
    const total = 4 + wave * 2;
    const enemies: SpawnPlan[] = [];

    for (let i = 0; i < total; i += 1) {
      let type: EnemyType;
      if (wave >= 8 && i % 5 === 0) {
        type = 'heavy';
      } else if (wave >= 5 && i % 6 === 4) {
        type = 'suicide';
      } else if (wave >= 3 && i % 4 === 2) {
        type = 'heavy';
      } else {
        type = 'small';
      }

      enemies.push({
        type,
        cell: this.scene.grid.plannedSpawnCell(wave, i),
      });
    }

    return enemies;
  }
}
