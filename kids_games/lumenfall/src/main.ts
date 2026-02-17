const canvas = document.getElementById('game-canvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected #game-canvas to be a canvas element.');
}

const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Could not create 2D canvas context.');
}

const square = {
  x: 40,
  y: 100,
  size: 48,
  velocityX: 140,
};

let lastFrameTime = performance.now();
let fps = 0;
let fpsAccumulatorTime = 0;
let fpsAccumulatorFrames = 0;

const resizeCanvas = (): void => {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const draw = (deltaSeconds: number): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  square.x += square.velocityX * deltaSeconds;

  if (square.x <= 0) {
    square.x = 0;
    square.velocityX *= -1;
  }

  if (square.x + square.size >= width) {
    square.x = width - square.size;
    square.velocityX *= -1;
  }

  ctx.fillStyle = '#0c1b2a';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#12233f');
  gradient.addColorStop(1, '#050914');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#7ad7ff';
  ctx.fillRect(square.x, square.y, square.size, square.size);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText(`FPS: ${fps.toFixed(1)} | DPR: ${(window.devicePixelRatio || 1).toFixed(2)}`, 16, 28);
};

const loop = (timestamp: number): void => {
  const deltaMs = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  const deltaSeconds = Math.min(deltaMs / 1000, 0.1);
  fpsAccumulatorTime += deltaMs;
  fpsAccumulatorFrames += 1;

  if (fpsAccumulatorTime >= 250) {
    fps = (fpsAccumulatorFrames * 1000) / fpsAccumulatorTime;
    fpsAccumulatorTime = 0;
    fpsAccumulatorFrames = 0;
  }

  draw(deltaSeconds);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
