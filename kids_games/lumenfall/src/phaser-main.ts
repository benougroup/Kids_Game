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
  // RESIZE mode: canvas fills the container exactly, no browser scaling
  // This prevents non-integer scale factors that cause tile gap artifacts
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
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
