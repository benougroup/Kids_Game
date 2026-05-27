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
  width: 800,
  height: 550, // Smaller vertical size so buttons aren't cut off
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
  backgroundColor: '#1a1a2e',
};

// Create game instance
const game = new Phaser.Game(config);

// No resize handler needed - using FIT mode with fixed size

export default game;
