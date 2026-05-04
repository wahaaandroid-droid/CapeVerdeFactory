import type { GameScene } from '../GameScene';
import { EnemyType } from '../types';

type WaveState = 'preparation' | 'combat' | 'upgrade' | 'finished' | 'stopped';

export class WaveSystem {
  readonly maxWave = 10;
  wave = 0;
  state: WaveState = 'preparation';
  private nextSpawnAt = 0;
  private spawnQueue: EnemyType[] = [];

  constructor(private readonly scene: GameScene) {}

  startPreparation(): void {
    if (this.wave >= this.maxWave) {
      this.state = 'finished';
      return;
    }

    this.state = 'preparation';
    this.spawnQueue = [];
    this.scene.setStatus('準備フェーズ: ラインを組んで準備完了を押す');
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
      const enemyType = this.spawnQueue.shift();
      if (enemyType) {
        this.scene.spawnEnemy(enemyType, this.wave);
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
    this.scene.setStatus(`ウェーブ${this.wave}クリア。強化を選択`);
    this.scene.upgrades.show();
  }

  private buildWave(wave: number): EnemyType[] {
    const total = 5 + wave * 2;
    const enemies: EnemyType[] = [];

    for (let i = 0; i < total; i += 1) {
      if (wave >= 5 && i % 6 === 4) {
        enemies.push('suicide');
      } else if (wave >= 3 && i % 4 === 2) {
        enemies.push('heavy');
      } else {
        enemies.push('small');
      }
    }

    return enemies;
  }
}
