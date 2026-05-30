import type Phaser from 'phaser';
import { MONSTER_DEFINITIONS } from './EntityRegistry';

const LOOSE_CREATURE_PATHS: Record<string, string> = {
  rabbit: 'assets/sprites/creatures/animals_peaceful/rabbit',
  bird: 'assets/sprites/creatures/animals_peaceful/bird',
  slime: 'assets/sprites/creatures/monsters/slime',
  wolf: 'assets/sprites/creatures/animals_aggressive/wolf',
  zombie: 'assets/sprites/creatures/undead/zombie',
  demon: 'assets/sprites/creatures/dark_entities/demon',
};

const CREATURE_TEXTURE_SIZE = 64;

type CreatureKind = 'rabbit' | 'bird' | 'slime' | 'wolf' | 'zombie' | 'demon' | 'dragon';

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
  flame?: boolean;
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
  const frameKeys = new Set(getLooseCreatureFrameLoads().map(({ key }) => key));

  for (const def of Object.values(MONSTER_DEFINITIONS)) {
    if (def.atlas !== 'creatures') continue;
    for (const frame of Object.values(def.frames).flatMap((value) => Array.isArray(value) ? value : [value])) {
      if (getCreatureKind(frame)) frameKeys.add(frame);
    }
  }

  for (const key of frameKeys) {
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
  if (frameKey.startsWith('wolf_')) return 'wolf';
  if (frameKey.startsWith('zombie_')) return 'zombie';
  if (frameKey.startsWith('demon_')) return 'demon';
  if (frameKey.startsWith('dragon_')) return 'dragon';
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
    case 'wolf':
      drawWolf(ctx, frameKey);
      break;
    case 'zombie':
      drawZombie(ctx, frameKey);
      break;
    case 'demon':
      drawDemon(ctx, frameKey);
      break;
    case 'dragon':
      drawDragon(ctx, frameKey);
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

function drawWolf(ctx: CanvasRenderingContext2D, frameKey: string): void {
  const n = getFrameNumber(frameKey);
  const run = frameKey.includes('sprint') || frameKey.includes('walk');
  const dx = run ? (n % 2 === 0 ? 2 : -2) : 0;
  fillEllipse(ctx, 32 + dx, 53, 21, 4, 'rgba(0, 0, 0, 0.22)');
  fillEllipse(ctx, 34 + dx, 36, 19, 10, '#6f6257');
  fillPolygon(ctx, [[17 + dx, 34], [7 + dx, 29], [15 + dx, 42]], '#5a4d43');
  fillPolygon(ctx, [[47 + dx, 27], [53 + dx, 13], [56 + dx, 31]], '#5a4d43');
  fillEllipse(ctx, 48 + dx, 30, 11, 9, '#7c7065');
  fillPolygon(ctx, [[40 + dx, 24], [42 + dx, 12], [47 + dx, 22]], '#4d4038');
  fillPolygon(ctx, [[54 + dx, 23], [58 + dx, 12], [59 + dx, 26]], '#4d4038');
  fillEllipse(ctx, 51 + dx, 31, 2, 2, '#101010');
  fillEllipse(ctx, 58 + dx, 35, 3, 2, '#1b1b1b');
  strokeLine(ctx, 24 + dx, 43, 20 + dx, 52, '#3f332b', 3);
  strokeLine(ctx, 41 + dx, 43, 45 + dx, 52, '#3f332b', 3);
  if (frameKey.includes('howl')) strokeLine(ctx, 56 + dx, 34, 60 + dx, 28, '#1b1b1b', 2);
}

function drawZombie(ctx: CanvasRenderingContext2D, frameKey: string): void {
  const n = getFrameNumber(frameKey);
  const stagger = frameKey.includes('walk') ? (n % 2 === 0 ? 2 : -2) : 0;
  fillEllipse(ctx, 32, 54, 15, 4, 'rgba(0, 0, 0, 0.22)');
  fillEllipse(ctx, 32 + stagger, 24, 10, 10, '#8db06f');
  fillEllipse(ctx, 28 + stagger, 22, 2, 2, '#1b1b1b');
  fillEllipse(ctx, 36 + stagger, 22, 2, 2, '#1b1b1b');
  strokeLine(ctx, 28 + stagger, 29, 36 + stagger, 30, '#35582e', 2);
  fillPolygon(ctx, [[23 + stagger, 34], [41 + stagger, 33], [45, 51], [20, 51]], '#5b4a8a');
  fillPolygon(ctx, [[23 + stagger, 35], [10, 43], [13, 47], [26 + stagger, 41]], '#8db06f');
  fillPolygon(ctx, [[40 + stagger, 35], [55, 42], [52, 47], [37 + stagger, 41]], '#8db06f');
  strokeLine(ctx, 27, 51, 23 + stagger, 58, '#6e8f55', 4);
  strokeLine(ctx, 38, 51, 43 - stagger, 58, '#6e8f55', 4);
  if (frameKey.includes('bite') || frameKey.includes('grab')) fillEllipse(ctx, 32 + stagger, 31, 5, 2, '#331b1b');
}

function drawDemon(ctx: CanvasRenderingContext2D, frameKey: string): void {
  const n = getFrameNumber(frameKey);
  const flap = frameKey.includes('wing') || frameKey.includes('walk') ? (n % 2 === 0 ? 5 : -2) : 0;
  fillEllipse(ctx, 33, 55, 18, 4, 'rgba(0, 0, 0, 0.25)');
  fillPolygon(ctx, [[24, 34], [7, 22 - flap], [14, 47], [25, 45]], '#5b1b6b');
  fillPolygon(ctx, [[40, 34], [57, 22 - flap], [50, 47], [39, 45]], '#5b1b6b');
  fillEllipse(ctx, 32, 35, 14, 15, '#9b2424');
  fillEllipse(ctx, 32, 22, 10, 9, '#b83232');
  fillPolygon(ctx, [[24, 17], [17, 6], [28, 15]], '#f0d06a');
  fillPolygon(ctx, [[40, 17], [47, 6], [36, 15]], '#f0d06a');
  fillEllipse(ctx, 28, 21, 2, 2, '#ffd45a');
  fillEllipse(ctx, 36, 21, 2, 2, '#ffd45a');
  fillPolygon(ctx, [[28, 28], [36, 28], [32, 32]], '#241010');
  if (frameKey.includes('hellfire') || frameKey.includes('fire')) {
    fillPolygon(ctx, [[32, 49], [26, 58], [32, 55], [38, 58]], '#ff8c1a');
    fillPolygon(ctx, [[32, 49], [29, 56], [32, 54], [35, 56]], '#ffe066');
  }
}

function drawDragon(ctx: CanvasRenderingContext2D, frameKey: string): void {
  const n = getFrameNumber(frameKey);
  const flap = frameKey.includes('fly') || frameKey.includes('walk') ? (n % 2 === 0 ? 7 : -3) : 0;
  fillEllipse(ctx, 32, 56, 23, 4, 'rgba(0, 0, 0, 0.24)');
  fillPolygon(ctx, [[26, 34], [7, 18 - flap], [13, 45], [27, 43]], '#2b7a4b');
  fillPolygon(ctx, [[39, 34], [59, 18 - flap], [52, 45], [38, 43]], '#2b7a4b');
  fillEllipse(ctx, 33, 38, 18, 12, '#3fa15f');
  fillPolygon(ctx, [[15, 39], [2, 34], [14, 48]], '#2e7748');
  fillEllipse(ctx, 47, 29, 12, 10, '#4fbd72');
  fillPolygon(ctx, [[42, 21], [42, 10], [48, 20]], '#f1da62');
  fillPolygon(ctx, [[52, 21], [57, 10], [57, 24]], '#f1da62');
  fillEllipse(ctx, 51, 27, 2, 2, '#101010');
  fillPolygon(ctx, [[57, 32], [63, 29], [58, 36]], '#2e7748');
  for (let x = 23; x <= 42; x += 6) fillPolygon(ctx, [[x, 25], [x + 3, 17], [x + 6, 25]], '#e8cf55');
  if (frameKey.includes('fire')) {
    fillPolygon(ctx, [[60, 33], [64, 25], [64, 40]], '#ff7a18');
    fillPolygon(ctx, [[61, 33], [64, 29], [64, 37]], '#ffe066');
  }
}
