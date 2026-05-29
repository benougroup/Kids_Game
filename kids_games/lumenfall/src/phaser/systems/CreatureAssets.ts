import type Phaser from 'phaser';
import { MONSTER_DEFINITIONS } from './EntityRegistry';

const LOOSE_CREATURE_PATHS: Record<string, string> = {
  rabbit: 'assets/sprites/creatures/animals_peaceful/rabbit',
  bird: 'assets/sprites/creatures/animals_peaceful/bird',
  slime: 'assets/sprites/creatures/monsters/slime',
};

const CREATURE_TEXTURE_SIZE = 64;

type CreatureKind = 'rabbit' | 'bird' | 'slime';

interface CreatureDrawOptions {
  dx?: number;
  dy?: number;
  hop?: number;
  side?: number;
  flap?: number;
  sleep?: boolean;
  eat?: boolean;
  flee?: boolean;
  sing?: boolean;
  squash?: number;
  angry?: boolean;
  split?: boolean;
}

export function getLooseCreatureFrameLoads(): Array<{ key: string; path: string }> {
  const loads = new Map<string, string>();

  for (const def of Object.values(MONSTER_DEFINITIONS)) {
    for (const frame of Object.values(def.frames).flatMap((value) => Array.isArray(value) ? value : [value])) {
      const [prefix, ...nameParts] = frame.split('_');
      const basePath = LOOSE_CREATURE_PATHS[prefix];
      const fileName = nameParts.join('_');
      if (!basePath || !fileName) continue;
      loads.set(frame, `${basePath}/${fileName}.png`);
    }
  }

  return [...loads.entries()].map(([key, path]) => ({ key, path }));
}

/**
 * The checked-in creature PNG files are placeholder/source assets in some builds
 * and can render as cropped words such as "IDLE". Keep the repository change
 * code-only by replacing those loose-frame textures at runtime with small
 * centered canvas sprites after preload has completed and before entities spawn.
 */
export function installProceduralCreatureTextures(scene: Phaser.Scene): void {
  for (const { key } of getLooseCreatureFrameLoads()) {
    const kind = getCreatureKind(key);
    if (!kind) continue;

    const canvas = document.createElement('canvas');
    canvas.width = CREATURE_TEXTURE_SIZE;
    canvas.height = CREATURE_TEXTURE_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.clearRect(0, 0, CREATURE_TEXTURE_SIZE, CREATURE_TEXTURE_SIZE);
    drawCreatureFrame(ctx, kind, key);

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    scene.textures.addCanvas(key, canvas);
  }
}

function getCreatureKind(frameKey: string): CreatureKind | null {
  if (frameKey.startsWith('rabbit_')) return 'rabbit';
  if (frameKey.startsWith('bird_')) return 'bird';
  if (frameKey.startsWith('slime_')) return 'slime';
  return null;
}

function drawCreatureFrame(ctx: CanvasRenderingContext2D, kind: CreatureKind, frameKey: string): void {
  switch (kind) {
    case 'rabbit':
      drawRabbit(ctx, getRabbitOptions(frameKey));
      break;
    case 'bird':
      drawBird(ctx, getBirdOptions(frameKey));
      break;
    case 'slime':
      drawSlime(ctx, getSlimeOptions(frameKey));
      break;
  }
}

function getRabbitOptions(frameKey: string): CreatureDrawOptions {
  const frameNumber = getFrameNumber(frameKey);
  const isLeft = frameKey.includes('_left_');
  const isRight = frameKey.includes('_right_');
  const movingSide = isRight ? 1 : isLeft ? -1 : 0;
  const activeHop = frameKey.includes('_walk_') || frameKey.includes('_flee_');

  return {
    dx: movingSide * (2 + frameNumber),
    dy: frameKey.includes('_sleep_') ? 3 : frameNumber % 2,
    hop: activeHop && frameNumber % 2 === 0 ? 3 : 0,
    side: movingSide || (frameKey.includes('_up_') ? 1 : 0),
    sleep: frameKey.includes('_sleep_'),
    eat: frameKey.includes('_eat_'),
    flee: frameKey.includes('_flee_'),
  };
}

function getBirdOptions(frameKey: string): CreatureDrawOptions {
  const frameNumber = getFrameNumber(frameKey);
  const isLeft = frameKey.includes('_left_');
  const isRight = frameKey.includes('_right_');
  const movingSide = isRight ? 1 : isLeft ? -1 : 0;
  const flying = frameKey.includes('_fly_');

  return {
    dx: movingSide * (1 + frameNumber),
    dy: flying ? -2 - frameNumber : frameNumber % 2,
    flap: flying ? (frameNumber % 2 === 0 ? 6 : -5) : 0,
    side: movingSide,
    sleep: frameKey.includes('_sleep_'),
    sing: frameKey.includes('_sing_'),
  };
}

function getSlimeOptions(frameKey: string): CreatureDrawOptions {
  const frameNumber = getFrameNumber(frameKey);
  const isLeft = frameKey.includes('_left_');
  const isRight = frameKey.includes('_right_');

  return {
    dx: isRight ? 2 + frameNumber : isLeft ? -2 - frameNumber : 0,
    dy: frameKey.includes('_up_') ? -frameNumber : frameKey.includes('_down_') ? frameNumber : 0,
    squash: frameKey.includes('_absorb_') ? 3 + frameNumber : frameNumber % 3,
    angry: frameKey.includes('_angry_'),
    split: frameKey.includes('_split_'),
  };
}

function getFrameNumber(frameKey: string): number {
  const match = frameKey.match(/_f(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fillStyle: string,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, fillStyle: string): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle: string,
  lineWidth = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawRabbit(ctx: CanvasRenderingContext2D, options: CreatureDrawOptions): void {
  const { dx = 0, dy = 0, hop = 0, side = 0, sleep = false, eat = false, flee = false } = options;
  const bodyX = 34 + dx + side * 2;
  const bodyY = 41 + dy - hop;
  const headX = 26 + dx + side * 4;
  const headY = 32 + dy - hop;

  fillEllipse(ctx, 33 + dx, 53 + dy, 18, 4, 'rgba(0, 0, 0, 0.2)');
  fillEllipse(ctx, 25 + dx, 50 + dy - hop, 7, 3, '#6f432b');
  fillEllipse(ctx, 42 + dx, 50 + dy - hop, 8, 3, '#6f432b');
  fillEllipse(ctx, 49 + dx + side, 36 + dy - hop, 5, 5, '#fff4dc');
  fillEllipse(ctx, bodyX, bodyY, 17, 10, '#9c6a44');
  fillEllipse(ctx, bodyX - 4, bodyY - 2, 12, 7, '#c99a6b');
  fillEllipse(ctx, headX, headY, 10, 9, '#9c6a44');
  fillEllipse(ctx, headX - 3, headY - 15, 4, flee ? 11 : 13, '#9c6a44');
  fillEllipse(ctx, headX + 4, headY - 15, 4, flee ? 11 : 13, '#9c6a44');
  fillEllipse(ctx, headX - 3, headY - 15, 2, flee ? 7 : 9, '#e7a1a8');
  fillEllipse(ctx, headX + 4, headY - 15, 2, flee ? 7 : 9, '#e7a1a8');

  if (sleep) {
    strokeLine(ctx, headX - 5, headY, headX - 1, headY, '#1b1b1b');
    strokeLine(ctx, headX + 2, headY, headX + 6, headY, '#1b1b1b');
  } else {
    fillEllipse(ctx, headX + 2 + side, headY - 1, 2, 2, '#1b1b1b');
    fillEllipse(ctx, headX + 3 + side, headY - 2, 0.75, 0.75, '#ffffff');
  }

  fillEllipse(ctx, headX - 6 + side, headY + 2, 3, 2, '#c99a6b');
  fillEllipse(ctx, headX - 8 + side, headY + 2, 1, 1, '#e7a1a8');
  if (eat) {
    strokeLine(ctx, headX - 9, headY + 5, headX - 17, headY + 9, '#63b35d');
    strokeLine(ctx, headX - 13, headY + 7, headX - 16, headY + 3, '#63b35d');
  }
}

function drawBird(ctx: CanvasRenderingContext2D, options: CreatureDrawOptions): void {
  const { dx = 0, dy = 0, flap = 0, side = 0, sleep = false, sing = false } = options;

  fillEllipse(ctx, 32 + dx, 52 + dy, 11, 3, 'rgba(0, 0, 0, 0.18)');
  fillEllipse(ctx, 33 + dx, 36 + dy, 12, 10, '#4b85d8');
  fillEllipse(ctx, 27 + dx, 31 + dy, 8, 8, '#81b6ff');
  fillPolygon(ctx, [[19 + dx, 31 + dy], [11 + dx, 27 + dy], [18 + dx, 36 + dy]], '#24569a');
  fillPolygon(ctx, [[36 + dx, 36 + dy], [50 + dx, 29 + dy - flap], [42 + dx, 43 + dy + flap]], '#24569a');
  fillPolygon(ctx, [[19 + dx, 31 + dy], [13 + dx, 28 + dy], [13 + dx, 34 + dy]], '#f6b23d');
  if (sleep) strokeLine(ctx, 26 + dx, 30 + dy, 31 + dx, 30 + dy, '#1b1b1b');
  else fillEllipse(ctx, 26 + dx + side, 29 + dy, 2, 2, '#1b1b1b');
  strokeLine(ctx, 31 + dx, 45 + dy, 29 + dx, 51 + dy, '#5b3b24');
  strokeLine(ctx, 38 + dx, 44 + dy, 39 + dx, 51 + dy, '#5b3b24');
  if (sing) {
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(11 + dx, 18 + dy, 2, 6);
    ctx.fillRect(13 + dx, 18 + dy, 4, 2);
    fillEllipse(ctx, 11 + dx, 24 + dy, 3, 2, '#1b1b1b');
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, options: CreatureDrawOptions): void {
  const { dx = 0, dy = 0, squash = 0, angry = false, split = false } = options;
  const body = angry ? 'rgba(232, 90, 90, 0.96)' : 'rgba(84, 215, 110, 0.9)';
  const radiusX = 18 + squash;
  const radiusY = 13 - Math.floor(squash / 2);

  fillEllipse(ctx, 32 + dx, 52 + dy, 18, 4, 'rgba(0, 0, 0, 0.2)');
  fillEllipse(ctx, 32 + dx, 39 + dy, radiusX, radiusY, body);
  fillEllipse(ctx, 25 + dx, 33 + dy, 7, 5, 'rgba(185, 255, 208, 0.82)');
  if (angry) {
    strokeLine(ctx, 24 + dx, 36 + dy, 30 + dx, 39 + dy, '#1b1b1b', 2);
    strokeLine(ctx, 40 + dx, 39 + dy, 46 + dx, 36 + dy, '#1b1b1b', 2);
  } else {
    fillEllipse(ctx, 26 + dx, 37 + dy, 2, 3, '#1b1b1b');
    fillEllipse(ctx, 40 + dx, 37 + dy, 2, 3, '#1b1b1b');
  }
  strokeLine(ctx, 28 + dx, 45 + dy, 37 + dx, 46 + dy, '#278a45', 2);
  if (split) {
    fillEllipse(ctx, 16 + dx, 45 + dy, 6, 5, body);
    fillEllipse(ctx, 49 + dx, 45 + dy, 6, 5, body);
  }
}
