/**
 * Lumenfall - Rebuilt with Phaser 3
 * 
 * Modern isometric RPG with smooth 8-direction movement
 * Inspired by Diablo, Ragnarok Online, and Pokémon
 */

import Phaser from 'phaser';
import { GameScene } from './phaser/scenes/GameScene';
import { UIScene } from './phaser/scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  // iPad-friendly canvas: 720×480 (3:2 ratio)
  // On iPad Air (820×1180 portrait / 1180×820 landscape) this fits perfectly
  // FIT mode scales up/down to fill the screen while preserving ratio
  width: 720,
  height: 480,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,        // Disable antialiasing — prevents sub-pixel tile bleeding
    roundPixels: true,       // Snap sprites to whole pixels — eliminates grid line gaps
    pixelArt: true,          // Optimise for pixel art rendering
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [GameScene, UIScene],
  // Grass green background — any sub-pixel gaps between ground tiles blend in
  backgroundColor: '#4a7a2a',
};

// Create game instance
const game = new Phaser.Game(config);

export default game;
