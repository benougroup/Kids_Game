/**
 * NPCBubble — floating emoji speech bubble above NPCs
 *
 * Bubble types:
 *   talking   → white bubble with animated "…" dots (only for NPCs with dialogueKey)
 *   question  → yellow bubble with "?"
 *   sick      → green bubble with "🤒"
 *   sleeping  → blue bubble with "💤"
 *   confused  → purple bubble with "😵"
 *   dead      → dark bubble with "💀"
 *   silent    → no bubble (NPCs with no dialogueKey and normal state)
 *
 * The bubble floats above the sprite, gently bobbing up and down.
 * When the player is within interact range, the talking bubble pulses.
 */

import Phaser from 'phaser';

export type BubbleType = 'talking' | 'question' | 'sick' | 'sleeping' | 'confused' | 'dead' | 'silent';

interface BubbleConfig {
  emoji: string;
  bgColor: number;
  borderColor: number;
  textColor: string;
}

const BUBBLE_CONFIGS: Record<Exclude<BubbleType, 'silent'>, BubbleConfig> = {
  talking:  { emoji: '…',  bgColor: 0xffffff, borderColor: 0xcccccc, textColor: '#333333' },
  question: { emoji: '?',  bgColor: 0xffe066, borderColor: 0xcc9900, textColor: '#664400' },
  sick:     { emoji: '🤒', bgColor: 0xd4f5c0, borderColor: 0x55aa33, textColor: '#226611' },
  sleeping: { emoji: '💤', bgColor: 0xd0e8ff, borderColor: 0x4488cc, textColor: '#224466' },
  confused: { emoji: '😵', bgColor: 0xeeddff, borderColor: 0x9944cc, textColor: '#441166' },
  dead:     { emoji: '💀', bgColor: 0x222222, borderColor: 0x555555, textColor: '#aaaaaa' },
};

export class NPCBubble {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private tail: Phaser.GameObjects.Graphics;
  private currentType: BubbleType = 'silent';
  private bobTween: Phaser.Tweens.Tween | null = null;
  private dotTimer = 0;
  private dotState = 0;
  private readonly W = 36;
  private readonly H = 28;
  private readonly R = 7;   // corner radius
  private readonly TAIL = 7; // tail height

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.tail = scene.add.graphics();
    this.bg   = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#333333',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.container = scene.add.container(x, y, [this.tail, this.bg, this.label]);
    this.container.setDepth(8000);
    this.container.setVisible(false);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  public show(type: BubbleType): void {
    if (type === 'silent') { this.hide(); return; }
    if (type === this.currentType && this.container.visible) return;

    this.currentType = type;
    this.container.setVisible(true);
    this.redraw(type);
    this.startBob();
  }

  public hide(): void {
    this.currentType = 'silent';
    this.container.setVisible(false);
    this.bobTween?.stop();
    this.bobTween = null;
  }

  /** Call every frame from Entity.update() — handles dot animation and position sync */
  public update(spriteX: number, spriteY: number, spriteHeight: number, delta: number): void {
    // Keep bubble above sprite
    this.container.setPosition(spriteX, spriteY - spriteHeight * 0.5 - this.H - this.TAIL - 4);

    // Animate "…" dots for talking bubble
    if (this.currentType === 'talking') {
      this.dotTimer += delta;
      if (this.dotTimer > 400) {
        this.dotTimer = 0;
        this.dotState = (this.dotState + 1) % 4;
        const dots = ['·', '· ·', '· · ·', '· · ·'][this.dotState];
        this.label.setText(dots);
      }
    }
  }

  /** Pulse the bubble when player is nearby (called by GameScene) */
  public pulse(): void {
    if (!this.container.visible) return;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  public setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  public destroy(): void {
    this.bobTween?.stop();
    this.container.destroy();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private redraw(type: Exclude<BubbleType, 'silent'>): void {
    const cfg = BUBBLE_CONFIGS[type];
    const w = this.W, h = this.H, r = this.R;
    const hw = w / 2, hh = h / 2;

    // Background rounded rect
    this.bg.clear();
    this.bg.fillStyle(cfg.bgColor, 1);
    this.bg.lineStyle(2, cfg.borderColor, 1);
    this.bg.fillRoundedRect(-hw, -hh, w, h, r);
    this.bg.strokeRoundedRect(-hw, -hh, w, h, r);

    // Tail (small triangle pointing down from center-bottom)
    this.tail.clear();
    this.tail.fillStyle(cfg.bgColor, 1);
    this.tail.lineStyle(2, cfg.borderColor, 1);
    this.tail.fillTriangle(-5, hh, 5, hh, 0, hh + this.TAIL);
    this.tail.strokeTriangle(-5, hh, 5, hh, 0, hh + this.TAIL);

    // Label
    this.label.setColor(cfg.textColor);

    if (type === 'talking') {
      this.label.setFontSize(12);
      this.label.setText('·');
      this.dotTimer = 0;
      this.dotState = 0;
    } else {
      // Use emoji for all other types
      this.label.setFontSize(14);
      this.label.setText(cfg.emoji);
    }
  }

  private startBob(): void {
    this.bobTween?.stop();
    // Gentle bob: move up 4px and back, looping
    this.bobTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 4,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }
}
