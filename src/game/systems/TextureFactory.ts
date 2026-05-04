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

  makeTexture(scene, 'direction-arrow', 12, 12, (graphics) => {
    graphics.fillStyle(0xf7c744, 1);
    graphics.fillTriangle(1, 2, 11, 6, 1, 10);
    graphics.fillStyle(0x8a5a18, 1);
    graphics.fillRect(1, 5, 5, 2);
  });
}
