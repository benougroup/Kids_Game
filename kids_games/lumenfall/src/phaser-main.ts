/**
 * Lumenfall - Rebuilt with Phaser 3
 *
 * Modern isometric RPG with smooth 8-direction movement
 * Inspired by Diablo, Ragnarok Online, and Pokémon
 */
import Phaser from 'phaser';
import { GameScene } from './phaser/scenes/GameScene';
import { UIScene } from './phaser/scenes/UIScene';

function showStartupError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Lumenfall startup failed', error);

  const container = document.getElementById('game-container') ?? document.body;
  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'position:fixed',
    'inset:16px',
    'z-index:99999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:16px',
    'background:#1a1a2e',
    'color:#fff0d0',
    'font:16px/1.4 Arial,sans-serif',
    'text-align:center',
  ].join(';');
  panel.textContent = `Lumenfall could not start: ${message}`;
  container.appendChild(panel);
}

function createGameConfig(): Phaser.Types.Core.GameConfig {
  const parent = document.getElementById('game-container');
  if (!parent) throw new Error('Expected #game-container element.');

  const width = Math.max(1, parent.clientWidth || window.innerWidth || 720);
  const height = Math.max(1, parent.clientHeight || window.innerHeight || 480);

  return {
    type: Phaser.AUTO,
    parent,
    // RESIZE mode: canvas fills the container exactly, no browser scaling.
    // This prevents non-integer scale factors that cause tile gap artifacts.
    width,
    height,
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
    // Grass green background — any sub-pixel gaps between ground tiles blend in.
    backgroundColor: '#4a7a2a',
  };
}

function boot(): Phaser.Game {
  const game = new Phaser.Game(createGameConfig());
  // Expose globally for debugging/testing.
  (window as any).__game = game;
  return game;
}

window.addEventListener('error', (event) => showStartupError(event.error ?? event.message), { once: true });
window.addEventListener('unhandledrejection', (event) => showStartupError(event.reason), { once: true });

let game: Phaser.Game | null = null;

function startSafely(): void {
  try {
    game = boot();
  } catch (error) {
    showStartupError(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSafely, { once: true });
} else {
  startSafely();
}

export default game;
