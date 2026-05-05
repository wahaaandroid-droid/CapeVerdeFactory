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
  {
    id: 'ammoSaver',
    title: '弾薬節約',
    body: '射撃時に弾を温存',
    color: 0xffd16a,
  },
  {
    id: 'specialist',
    title: '特殊兵器強化',
    body: '通常以外の砲台威力 +25%',
    color: 0x68d7ff,
  },
  {
    id: 'stockpile',
    title: '建材備蓄',
    body: '建材 +220',
    color: 0xd9a85f,
  },
  {
    id: 'droneOps',
    title: '航空管制',
    body: 'ドローン火力 +35%',
    color: 0x9de8ff,
  },
];

export class UpgradeSystem {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: GameScene) {}

  show(): void {
    this.hide();
    const available = UPGRADES.filter((upgrade) =>
      this.scene.isUpgradeUnlocked(upgrade.id),
    );
    const choices = Phaser.Utils.Array.Shuffle(available).slice(0, 3);
    const container = this.scene.add.container(0, 0).setDepth(200);
    this.scene.registerUiObject(container);
    const shade = this.scene.add.rectangle(0, 0, 1180, 760, 0x010409, 0.62).setOrigin(0);
    const panel = this.scene.add
      .rectangle(590, 380, 640, 310, 0x101820, 0.96)
      .setStrokeStyle(2, 0xb48b5e, 1);
    const title = this.scene.add
      .text(590, 256, 'アップグレードを選択', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '28px',
        color: '#fff4d2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subtitle = this.scene.add
      .text(590, 292, '効果は今回のランで永続します', {
        fontFamily: '"Yu Gothic", Meiryo, sans-serif',
        fontSize: '16px',
        color: '#c9d3dc',
      })
      .setOrigin(0.5);

    container.add([shade, panel, title, subtitle]);

    choices.forEach((choice, index) => {
      const x = 410 + index * 180;
      const button = this.scene.add
        .rectangle(x, 412, 168, 166, 0x172832, 1)
        .setStrokeStyle(2, choice.color, 0.95)
        .setInteractive({ useHandCursor: true });
      const icon = this.scene.add
        .rectangle(x, 360, 44, 34, choice.color, 1)
        .setStrokeStyle(2, 0x0b1118, 1);
      const titleText = this.scene.add
        .text(x, 394, choice.title, {
          fontFamily: '"Yu Gothic", Meiryo, sans-serif',
          fontSize: '15px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 142 },
          lineSpacing: 2,
        })
        .setOrigin(0.5, 0);
      const bodyText = this.scene.add
        .text(x, 452, choice.body, {
          fontFamily: '"Yu Gothic", Meiryo, sans-serif',
          fontSize: '14px',
          color: '#d8e8ef',
          align: 'center',
          wordWrap: { width: 142 },
          lineSpacing: 2,
        })
        .setOrigin(0.5, 0);

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
