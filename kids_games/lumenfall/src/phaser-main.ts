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
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
