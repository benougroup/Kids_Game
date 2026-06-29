/**
 * NPCBubble — floating emoji speech bubble above NPCs and monsters
 *
 * NPC bubble types:
 *   talking   → white bubble with animated "…" dots (NPCs with dialogueKey)
 *   question  → yellow bubble with "?"
 *   sick      → green bubble with "🤒"
 *   sleeping  → blue bubble with "💤"
 *   confused  → purple bubble with "😵"
 *   dead      → dark bubble with "💀"
 *
 * Monster/animal bubble types:
 *   sleepy    → soft blue bubble with "😴" (monster dormant / day-time)
 *   awake     → yellow bubble with "👀" (monster just spotted something)
 *   aggressive → red bubble with "⚠️" (monster in pursuit / attacking)
 *   alert     → orange bubble with "!" (monster heard a sound, not yet targeting)
 *
 *   silent    → no bubble
 *
 * The bubble floats above the sprite, gently bobbing up and down.
 * Aggressive bubbles shake rapidly to signal danger.
 */

import Phaser from 'phaser';

export type BubbleType =
  | 'talking' | 'question' | 'sick' | 'sleeping' | 'confused' | 'dead'
  | 'sleepy' | 'awake' | 'aggressive' | 'alert'
  | 'silent';

interface BubbleConfig {
  emoji: string;
  bgColor: number;
  borderColor: number;
  textColor: string;
  shake?: boolean;   // aggressive bubbles shake
  pulse?: boolean;   // awake/alert bubbles pulse
}

const BUBBLE_CONFIGS: Record<Exclude<BubbleType, 'silent'>, BubbleConfig> = {
  // ── NPC types ────────────────────────────────────────────────────────────
  talking:    { emoji: '…',  bgColor: 0xffffff, borderColor: 0xcccccc, textColor: '#333333' },
  question:   { emoji: '?',  bgColor: 0xffe066, borderColor: 0xcc9900, textColor: '#664400' },
  sick:       { emoji: '🤒', bgColor: 0xd4f5c0, borderColor: 0x55aa33, textColor: '#226611' },
  sleeping:   { emoji: '💤', bgColor: 0xd0e8ff, borderColor: 0x4488cc, textColor: '#224466' },
  confused:   { emoji: '😵', bgColor: 0xeeddff, borderColor: 0x9944cc, textColor: '#441166' },
  dead:       { emoji: '💀', bgColor: 0x222222, borderColor: 0x555555, textColor: '#aaaaaa' },

  // ── Monster / animal types ────────────────────────────────────────────────
  sleepy:     { emoji: '😴', bgColor: 0xd0e8ff, borderColor: 0x6699bb, textColor: '#224466' },
  awake:      { emoji: '👀', bgColor: 0xfffde0, borderColor: 0xddbb00, textColor: '#554400', pulse: true },
  aggressive: { emoji: '⚠️', bgColor: 0xff3322, borderColor: 0xcc1100, textColor: '#ffffff', shake: true },
  alert:      { emoji: '!',  bgColor: 0xff9900, borderColor: 0xcc6600, textColor: '#ffffff', pulse: true },
};

export class NPCBubble {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private tail: Phaser.GameObjects.Graphics;
  private currentType: BubbleType = 'silent';
  private bobTween: Phaser.Tweens.Tween | null = null;
  private shakeTween: Phaser.Tweens.Tween | null = null;
  private dotTimer = 0;
  private dotState = 0;
  private readonly W = 36;
  private readonly H = 28;
  private readonly R = 7;
  private readonly TAIL = 7;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.tail  = scene.add.graphics();
    this.bg    = scene.add.graphics();
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
    this.startAnimation(type);
  }

  public hide(): void {
    this.currentType = 'silent';
    this.container.setVisible(false);
    this.bobTween?.stop();
    this.bobTween = null;
    this.shakeTween?.stop();
    this.shakeTween = null;
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

    // Animate "!" for alert bubble — blink
    if (this.currentType === 'alert') {
      this.dotTimer += delta;
      if (this.dotTimer > 300) {
        this.dotTimer = 0;
        this.label.setVisible(!this.label.visible);
      }
    }
  }

  /** Pulse the bubble when player is nearby */
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
    this.shakeTween?.stop();
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
    this.label.setVisible(true);

    if (type === 'talking') {
      this.label.setFontSize(12);
      this.label.setText('·');
      this.dotTimer = 0;
      this.dotState = 0;
    } else if (type === 'aggressive') {
      // Larger warning symbol
      this.label.setFontSize(16);
      this.label.setText(cfg.emoji);
    } else {
      this.label.setFontSize(14);
      this.label.setText(cfg.emoji);
    }
  }

  private startAnimation(type: BubbleType): void {
    this.bobTween?.stop();
    this.shakeTween?.stop();
    this.bobTween = null;
    this.shakeTween = null;

    const cfg = type !== 'silent' ? BUBBLE_CONFIGS[type as Exclude<BubbleType, 'silent'>] : null;

    if (cfg?.shake) {
      // Aggressive: rapid left-right shake
      this.shakeTween = this.scene.tweens.add({
        targets: this.container,
        x: { from: this.container.x - 3, to: this.container.x + 3 },
        duration: 60,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (cfg?.pulse) {
      // Awake/alert: scale pulse
      this.bobTween = this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      // Default gentle bob
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
}
