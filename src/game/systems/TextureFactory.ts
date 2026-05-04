import Phaser from 'phaser';
import { TILE_SIZE } from '../types';

function tileFrame(
  graphics: Phaser.GameObjects.Graphics,
  base: number,
  stroke: number,
): void {
  graphics.fillStyle(base, 1);
  graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  graphics.lineStyle(1, stroke, 0.65);
  graphics.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function createPixelTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'tile-ground', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x2c2f30, 0x4d5354);
    graphics.fillStyle(0x3b3f3d, 1);
    graphics.fillRect(4, 5, 4, 2);
    graphics.fillRect(18, 14, 5, 2);
    graphics.fillStyle(0x202424, 1);
    graphics.fillRect(8, 22, 7, 2);
  });

  makeTexture(scene, 'tile-lava', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x2b1714, 0x623026);
    graphics.fillStyle(0xc23a20, 1);
    graphics.fillRect(3, 18, 7, 4);
    graphics.fillRect(13, 7, 4, 15);
    graphics.fillStyle(0xffa53a, 1);
    graphics.fillRect(14, 9, 2, 10);
    graphics.fillRect(5, 19, 4, 2);
  });

  makeTexture(scene, 'tile-geothermal', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x27353b, 0x4b717b);
    graphics.fillStyle(0x37b5ff, 1);
    graphics.fillRect(8, 8, 14, 2);
    graphics.fillRect(13, 4, 4, 18);
    graphics.fillStyle(0xa6eaff, 1);
    graphics.fillRect(14, 6, 2, 14);
  });

  makeTexture(scene, 'tile-resource', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x303436, 0x5f6667);
    graphics.fillStyle(0x9aa9b1, 1);
    graphics.fillRect(5, 17, 6, 5);
    graphics.fillRect(12, 10, 5, 6);
    graphics.fillRect(19, 16, 5, 5);
    graphics.fillStyle(0xd8eef8, 1);
    graphics.fillRect(7, 16, 2, 2);
    graphics.fillRect(14, 9, 2, 2);
  });

  makeTexture(scene, 'tile-resourceCopper', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x332d2a, 0x7a5a42);
    graphics.fillStyle(0xa95f33, 1);
    graphics.fillRect(6, 17, 7, 5);
    graphics.fillRect(14, 9, 6, 6);
    graphics.fillRect(22, 18, 5, 4);
    graphics.fillStyle(0xffc078, 1);
    graphics.fillRect(8, 16, 2, 2);
    graphics.fillRect(16, 8, 2, 2);
  });

  makeTexture(scene, 'tile-resourceOil', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x20232b, 0x4d5566);
    graphics.fillStyle(0x090b13, 1);
    graphics.fillRect(7, 15, 18, 9);
    graphics.fillRect(12, 10, 10, 6);
    graphics.fillStyle(0x2439a0, 1);
    graphics.fillRect(10, 17, 5, 2);
    graphics.fillRect(17, 12, 3, 2);
  });

  makeTexture(scene, 'tile-ocean', TILE_SIZE, TILE_SIZE, (graphics) => {
    tileFrame(graphics, 0x093446, 0x0c5a72);
    graphics.fillStyle(0x0a6d86, 1);
    graphics.fillRect(1, 6, 17, 2);
    graphics.fillRect(9, 19, 19, 2);
    graphics.fillStyle(0x62c8d9, 1);
    graphics.fillRect(4, 7, 8, 1);
    graphics.fillRect(18, 20, 7, 1);
  });

  makeTexture(scene, 'building-core', 30, 30, (graphics) => {
    graphics.fillStyle(0x162335, 1);
    graphics.fillRect(5, 8, 20, 16);
    graphics.fillStyle(0x4b5a65, 1);
    graphics.fillRect(2, 18, 26, 8);
    graphics.fillStyle(0x14c8ff, 1);
    graphics.fillRect(10, 6, 10, 18);
    graphics.fillStyle(0xb5f3ff, 1);
    graphics.fillRect(13, 8, 4, 14);
    graphics.lineStyle(2, 0x8ca1ad, 1);
    graphics.strokeRect(5, 8, 20, 16);
  });

  makeTexture(scene, 'building-miner', 30, 30, (graphics) => {
    graphics.fillStyle(0x2a2b2b, 1);
    graphics.fillRect(5, 14, 20, 12);
    graphics.fillStyle(0xc47b2b, 1);
    graphics.fillRect(8, 5, 5, 13);
    graphics.fillRect(11, 5, 13, 4);
    graphics.fillRect(21, 8, 4, 12);
    graphics.fillStyle(0xf1b35a, 1);
    graphics.fillRect(10, 6, 2, 10);
    graphics.fillStyle(0x5f6a6f, 1);
    graphics.fillRect(8, 19, 14, 5);
  });

  makeTexture(scene, 'building-conveyor', 30, 30, (graphics) => {
    graphics.fillStyle(0x171a1e, 1);
    graphics.fillRect(3, 8, 24, 14);
    graphics.lineStyle(2, 0x59636b, 1);
    graphics.strokeRect(3, 8, 24, 14);
    graphics.fillStyle(0xf5c331, 1);
    graphics.fillTriangle(12, 11, 21, 15, 12, 19);
    graphics.fillStyle(0x333b42, 1);
    graphics.fillRect(6, 10, 2, 10);
    graphics.fillRect(23, 10, 2, 10);
  });

  makeTexture(scene, 'building-ammoFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x2d3032, 1);
    graphics.fillRect(5, 8, 20, 18);
    graphics.fillStyle(0xb75a28, 1);
    graphics.fillRect(9, 5, 12, 6);
    graphics.fillRect(11, 3, 8, 4);
    graphics.fillStyle(0xff823a, 1);
    graphics.fillRect(12, 8, 6, 14);
    graphics.fillStyle(0x6d7980, 1);
    graphics.fillRect(7, 20, 16, 4);
    graphics.lineStyle(2, 0x88949b, 1);
    graphics.strokeRect(5, 8, 20, 18);
  });

  makeTexture(scene, 'building-metalPlateFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x262b2d, 1);
    graphics.fillRect(4, 8, 22, 18);
    graphics.fillStyle(0x8b969d, 1);
    graphics.fillRect(7, 11, 16, 4);
    graphics.fillRect(7, 18, 16, 4);
    graphics.fillStyle(0xe08d4d, 1);
    graphics.fillRect(11, 5, 8, 5);
    graphics.lineStyle(2, 0xaab7bf, 1);
    graphics.strokeRect(4, 8, 22, 18);
  });

  makeTexture(scene, 'building-plasticFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x202932, 1);
    graphics.fillRect(5, 8, 20, 18);
    graphics.fillStyle(0xe9f7ff, 1);
    graphics.fillRect(9, 15, 12, 6);
    graphics.fillStyle(0x5dd6ff, 1);
    graphics.fillRect(11, 5, 8, 8);
    graphics.fillStyle(0x64717a, 1);
    graphics.fillRect(20, 3, 4, 10);
    graphics.lineStyle(2, 0x9ab8c8, 1);
    graphics.strokeRect(5, 8, 20, 18);
  });

  makeTexture(scene, 'building-fuelFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x2f261e, 1);
    graphics.fillRect(5, 9, 20, 17);
    graphics.fillStyle(0xffb53d, 1);
    graphics.fillRect(10, 6, 10, 14);
    graphics.fillStyle(0x111421, 1);
    graphics.fillRect(12, 8, 6, 9);
    graphics.fillStyle(0xffdf78, 1);
    graphics.fillRect(13, 20, 4, 4);
    graphics.lineStyle(2, 0xa0713d, 1);
    graphics.strokeRect(5, 9, 20, 17);
  });

  makeTexture(scene, 'building-specialAmmoFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x252a34, 1);
    graphics.fillRect(4, 8, 22, 18);
    graphics.fillStyle(0x52cfff, 1);
    graphics.fillRect(8, 5, 4, 8);
    graphics.fillStyle(0xff7138, 1);
    graphics.fillRect(13, 5, 4, 8);
    graphics.fillStyle(0xffdc68, 1);
    graphics.fillRect(18, 5, 4, 8);
    graphics.fillStyle(0x727c86, 1);
    graphics.fillRect(8, 18, 14, 4);
    graphics.lineStyle(2, 0x8e98a6, 1);
    graphics.strokeRect(4, 8, 22, 18);
  });

  makeTexture(scene, 'building-missileFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x292d30, 1);
    graphics.fillRect(5, 8, 20, 18);
    graphics.fillStyle(0xffe88a, 1);
    graphics.fillTriangle(15, 3, 21, 15, 9, 15);
    graphics.fillStyle(0x707a84, 1);
    graphics.fillRect(10, 15, 10, 9);
    graphics.fillStyle(0xff7438, 1);
    graphics.fillRect(12, 23, 6, 3);
    graphics.lineStyle(2, 0xa1a9ad, 1);
    graphics.strokeRect(5, 8, 20, 18);
  });

  makeTexture(scene, 'building-droneFactory', 30, 30, (graphics) => {
    graphics.fillStyle(0x20272f, 1);
    graphics.fillRect(5, 9, 20, 16);
    graphics.fillStyle(0x87e8ff, 1);
    graphics.fillRect(12, 11, 6, 6);
    graphics.fillStyle(0x6b747d, 1);
    graphics.fillRect(7, 6, 5, 5);
    graphics.fillRect(18, 6, 5, 5);
    graphics.fillRect(7, 20, 5, 5);
    graphics.fillRect(18, 20, 5, 5);
    graphics.lineStyle(2, 0x92a0aa, 1);
    graphics.strokeRect(5, 9, 20, 16);
  });

  makeTexture(scene, 'building-turret', 30, 30, (graphics) => {
    graphics.fillStyle(0x25282b, 1);
    graphics.fillRect(8, 13, 14, 12);
    graphics.fillStyle(0x4b535b, 1);
    graphics.fillRect(11, 8, 8, 8);
    graphics.fillRect(18, 10, 10, 4);
    graphics.fillStyle(0x1eb4ff, 1);
    graphics.fillRect(13, 10, 4, 4);
    graphics.fillStyle(0xff8738, 1);
    graphics.fillRect(26, 10, 2, 4);
    graphics.lineStyle(2, 0x87919b, 1);
    graphics.strokeRect(8, 13, 14, 12);
  });

  makeTexture(scene, 'building-sniperTurret', 30, 30, (graphics) => {
    graphics.fillStyle(0x1f252b, 1);
    graphics.fillRect(9, 14, 12, 11);
    graphics.fillStyle(0x617080, 1);
    graphics.fillRect(12, 9, 7, 7);
    graphics.fillRect(17, 11, 12, 3);
    graphics.fillStyle(0xffe073, 1);
    graphics.fillRect(27, 11, 2, 3);
    graphics.lineStyle(2, 0x9aa8b5, 1);
    graphics.strokeRect(9, 14, 12, 11);
  });

  makeTexture(scene, 'building-cannonTurret', 30, 30, (graphics) => {
    graphics.fillStyle(0x2b2927, 1);
    graphics.fillRect(7, 13, 16, 13);
    graphics.fillStyle(0x5f6870, 1);
    graphics.fillRect(10, 8, 10, 8);
    graphics.fillRect(18, 9, 10, 6);
    graphics.fillStyle(0xff6834, 1);
    graphics.fillRect(26, 10, 3, 4);
    graphics.lineStyle(2, 0xa28d7a, 1);
    graphics.strokeRect(7, 13, 16, 13);
  });

  makeTexture(scene, 'building-empTurret', 30, 30, (graphics) => {
    graphics.fillStyle(0x1d2832, 1);
    graphics.fillRect(8, 13, 14, 12);
    graphics.fillStyle(0x68d7ff, 1);
    graphics.fillRect(12, 8, 7, 7);
    graphics.fillRect(19, 10, 8, 4);
    graphics.fillStyle(0xd5fbff, 1);
    graphics.fillRect(14, 10, 3, 3);
    graphics.lineStyle(2, 0x84cce4, 1);
    graphics.strokeRect(8, 13, 14, 12);
  });

  makeTexture(scene, 'building-missileTurret', 30, 30, (graphics) => {
    graphics.fillStyle(0x25292c, 1);
    graphics.fillRect(7, 14, 16, 11);
    graphics.fillStyle(0x6e777f, 1);
    graphics.fillRect(10, 8, 5, 10);
    graphics.fillRect(16, 8, 5, 10);
    graphics.fillStyle(0xffe88a, 1);
    graphics.fillRect(11, 5, 3, 5);
    graphics.fillRect(17, 5, 3, 5);
    graphics.lineStyle(2, 0xb3b6a8, 1);
    graphics.strokeRect(7, 14, 16, 11);
  });

  makeTexture(scene, 'building-droneTower', 30, 30, (graphics) => {
    graphics.fillStyle(0x18242e, 1);
    graphics.fillRect(8, 11, 14, 14);
    graphics.fillStyle(0x7fe8ff, 1);
    graphics.fillRect(12, 6, 6, 6);
    graphics.fillStyle(0x4d5a65, 1);
    graphics.fillRect(5, 18, 20, 4);
    graphics.fillRect(13, 10, 4, 14);
    graphics.lineStyle(2, 0x7aaec0, 1);
    graphics.strokeRect(8, 11, 14, 14);
  });

  makeTexture(scene, 'building-wall', 30, 30, (graphics) => {
    graphics.fillStyle(0x15191d, 1);
    graphics.fillRect(4, 6, 22, 20);
    graphics.fillStyle(0x46505a, 1);
    graphics.fillRect(5, 7, 8, 8);
    graphics.fillRect(14, 7, 11, 8);
    graphics.fillRect(5, 16, 11, 8);
    graphics.fillRect(17, 16, 8, 8);
    graphics.fillStyle(0x6f7d88, 1);
    graphics.fillRect(6, 8, 6, 2);
    graphics.fillRect(15, 8, 8, 2);
    graphics.fillRect(6, 17, 8, 2);
    graphics.fillRect(18, 17, 5, 2);
    graphics.fillStyle(0xff7a2f, 1);
    graphics.fillRect(4, 11, 2, 4);
    graphics.fillRect(24, 18, 2, 4);
    graphics.lineStyle(2, 0x8c98a3, 1);
    graphics.strokeRect(4, 6, 22, 20);
  });

  makeTexture(scene, 'enemy-small', 24, 24, (graphics) => {
    graphics.fillStyle(0x171b20, 1);
    graphics.fillRect(4, 8, 16, 11);
    graphics.fillStyle(0xde3030, 1);
    graphics.fillRect(7, 5, 10, 6);
    graphics.fillRect(2, 13, 4, 3);
    graphics.fillRect(18, 13, 4, 3);
    graphics.fillStyle(0xff9b8a, 1);
    graphics.fillRect(10, 7, 4, 3);
  });

  makeTexture(scene, 'enemy-heavy', 28, 28, (graphics) => {
    graphics.fillStyle(0x1a1e23, 1);
    graphics.fillRect(4, 8, 20, 15);
    graphics.fillStyle(0x8e252a, 1);
    graphics.fillRect(8, 4, 12, 7);
    graphics.fillRect(6, 14, 16, 5);
    graphics.fillStyle(0xff6c5b, 1);
    graphics.fillRect(12, 6, 4, 4);
    graphics.lineStyle(2, 0x4b5258, 1);
    graphics.strokeRect(4, 8, 20, 15);
  });

  makeTexture(scene, 'enemy-suicide', 24, 24, (graphics) => {
    graphics.fillStyle(0x241612, 1);
    graphics.fillRect(5, 7, 14, 12);
    graphics.fillStyle(0xff6b1a, 1);
    graphics.fillRect(8, 4, 8, 6);
    graphics.fillRect(10, 10, 4, 8);
    graphics.fillStyle(0xffc66b, 1);
    graphics.fillRect(11, 5, 2, 12);
  });

  makeTexture(scene, 'item-ore', 10, 10, (graphics) => {
    graphics.fillStyle(0xb8c5ce, 1);
    graphics.fillRect(2, 4, 6, 4);
    graphics.fillRect(4, 2, 3, 2);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(3, 3, 2, 2);
  });

  makeTexture(scene, 'item-ammo', 10, 10, (graphics) => {
    graphics.fillStyle(0xff7a2a, 1);
    graphics.fillRect(3, 2, 4, 6);
    graphics.fillStyle(0xffd082, 1);
    graphics.fillRect(4, 1, 2, 2);
    graphics.fillStyle(0x602312, 1);
    graphics.fillRect(3, 7, 4, 2);
  });

  makeTexture(scene, 'item-ironOre', 10, 10, (graphics) => {
    graphics.fillStyle(0xb8c5ce, 1);
    graphics.fillRect(2, 4, 6, 4);
    graphics.fillRect(4, 2, 3, 2);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(3, 3, 2, 2);
  });

  makeTexture(scene, 'item-copperOre', 10, 10, (graphics) => {
    graphics.fillStyle(0xc46d36, 1);
    graphics.fillRect(2, 4, 6, 4);
    graphics.fillRect(4, 2, 3, 2);
    graphics.fillStyle(0xffc184, 1);
    graphics.fillRect(3, 3, 2, 2);
  });

  makeTexture(scene, 'item-oil', 10, 10, (graphics) => {
    graphics.fillStyle(0x0b0c15, 1);
    graphics.fillRect(2, 3, 6, 5);
    graphics.fillStyle(0x4251c8, 1);
    graphics.fillRect(3, 4, 3, 1);
  });

  makeTexture(scene, 'item-ironPlate', 10, 10, (graphics) => {
    graphics.fillStyle(0xd5e2ea, 1);
    graphics.fillRect(2, 3, 6, 5);
    graphics.fillStyle(0x82909a, 1);
    graphics.fillRect(2, 7, 6, 1);
  });

  makeTexture(scene, 'item-copperPlate', 10, 10, (graphics) => {
    graphics.fillStyle(0xe99a54, 1);
    graphics.fillRect(2, 3, 6, 5);
    graphics.fillStyle(0x914d2b, 1);
    graphics.fillRect(2, 7, 6, 1);
  });

  makeTexture(scene, 'item-wire', 10, 10, (graphics) => {
    graphics.lineStyle(2, 0xf4b552, 1);
    graphics.strokeCircle(5, 5, 3);
    graphics.fillStyle(0x5f351a, 1);
    graphics.fillRect(4, 4, 2, 2);
  });

  makeTexture(scene, 'item-plastic', 10, 10, (graphics) => {
    graphics.fillStyle(0xe5f6ff, 1);
    graphics.fillRect(2, 3, 6, 5);
    graphics.fillStyle(0x8ddfff, 1);
    graphics.fillRect(3, 4, 4, 1);
  });

  makeTexture(scene, 'item-fuel', 10, 10, (graphics) => {
    graphics.fillStyle(0xffc34c, 1);
    graphics.fillRect(3, 2, 4, 6);
    graphics.fillStyle(0x6b341a, 1);
    graphics.fillRect(3, 7, 4, 1);
  });

  makeTexture(scene, 'item-enhancedAmmo', 10, 10, (graphics) => {
    graphics.fillStyle(0xffe073, 1);
    graphics.fillRect(3, 2, 4, 6);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(4, 2, 2, 2);
  });

  makeTexture(scene, 'item-incendiaryAmmo', 10, 10, (graphics) => {
    graphics.fillStyle(0xff6834, 1);
    graphics.fillRect(3, 2, 4, 6);
    graphics.fillStyle(0xffd66d, 1);
    graphics.fillRect(4, 1, 2, 2);
  });

  makeTexture(scene, 'item-empAmmo', 10, 10, (graphics) => {
    graphics.fillStyle(0x68d7ff, 1);
    graphics.fillRect(3, 2, 4, 6);
    graphics.fillStyle(0xd5fbff, 1);
    graphics.fillRect(4, 3, 2, 2);
  });

  makeTexture(scene, 'item-missile', 10, 10, (graphics) => {
    graphics.fillStyle(0xfff0a6, 1);
    graphics.fillTriangle(5, 1, 8, 8, 2, 8);
    graphics.fillStyle(0xff7438, 1);
    graphics.fillRect(4, 7, 2, 2);
  });

  makeTexture(scene, 'item-drone', 10, 10, (graphics) => {
    graphics.fillStyle(0x9de8ff, 1);
    graphics.fillRect(4, 4, 2, 2);
    graphics.fillStyle(0x607783, 1);
    graphics.fillRect(1, 2, 2, 2);
    graphics.fillRect(7, 2, 2, 2);
    graphics.fillRect(1, 7, 2, 2);
    graphics.fillRect(7, 7, 2, 2);
  });

  makeTexture(scene, 'direction-arrow', 12, 12, (graphics) => {
    graphics.fillStyle(0xf7c744, 1);
    graphics.fillTriangle(1, 2, 11, 6, 1, 10);
    graphics.fillStyle(0x8a5a18, 1);
    graphics.fillRect(1, 5, 5, 2);
  });
}
