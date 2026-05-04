import Phaser from 'phaser';
import type { GameScene } from '../GameScene';
import { UpgradeId } from '../types';

interface UpgradeDefinition {
  id: UpgradeId;
  title: string;
  body: string;
  color: number;
}

const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'turret',
    title: 'タレット強化',
    body: '攻撃力 +20%',
    color: 0xff9a38,
  },
  {
    id: 'belt',
    title: 'コンベア速度UP',
    body: '搬送間隔 -18%',
    color: 0xf5c331,
  },
  {
    id: 'production',
    title: '生産速度UP',
    body: '採掘と弾薬生成 +18%',
    color: 0x62d7ff,
  },
  {
    id: 'repair',
    title: 'コアHP回復',
    body: 'コアHP +120',
    color: 0x69e47c,
  },
];

export class UpgradeSystem {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: GameScene) {}

  show(): void {
    this.hide();
    const choices = Phaser.Utils.Array.Shuffle([...UPGRADES]).slice(0, 3);
    const container = this.scene.add.container(0, 0).setDepth(200);
    this.scene.registerUiObject(container);
    const shade = this.scene.add.rectangle(0, 0, 1180, 760, 0x010409, 0.62).setOrigin(0);
    const panel = this.scene.add
      .rectangle(590, 380, 560, 250, 0x101820, 0.96)
      .setStrokeStyle(2, 0xb48b5e, 1);
    const title = this.scene.add
      .text(590, 286, 'アップグレードを選択', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '28px',
        color: '#fff4d2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subtitle = this.scene.add
      .text(590, 318, '効果は今回のランで永続します', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#c9d3dc',
      })
      .setOrigin(0.5);

    container.add([shade, panel, title, subtitle]);

    choices.forEach((choice, index) => {
      const x = 430 + index * 160;
      const button = this.scene.add
        .rectangle(x, 398, 140, 120, 0x172832, 1)
        .setStrokeStyle(2, choice.color, 0.95)
        .setInteractive({ useHandCursor: true });
      const icon = this.scene.add
        .rectangle(x, 372, 36, 28, choice.color, 1)
        .setStrokeStyle(2, 0x0b1118, 1);
      const titleText = this.scene.add
        .text(x, 418, choice.title, {
          fontFamily: '"Yu Gothic", Meiryo, sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 120 },
        })
        .setOrigin(0.5);
      const bodyText = this.scene.add
        .text(x, 454, choice.body, {
          fontFamily: '"Yu Gothic", Meiryo, sans-serif',
          fontSize: '15px',
          color: '#d8e8ef',
          align: 'center',
          wordWrap: { width: 120 },
        })
        .setOrigin(0.5);

      button.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.scene.applyUpgrade(choice.id);
          this.hide();
          this.scene.wave.startPreparation();
        },
      );
      button.on('pointerover', () => button.setFillStyle(0x204452, 1));
      button.on('pointerout', () => button.setFillStyle(0x172832, 1));

      container.add([button, icon, titleText, bodyText]);
    });

    this.container = container;
  }

  hide(): void {
    this.container?.destroy(true);
    this.container = null;
  }
}
