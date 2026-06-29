import { GameApp } from './app/GameApp';

const canvas = document.getElementById('game-canvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected #game-canvas element.');
}

const app = new GameApp(canvas);
app.start();
