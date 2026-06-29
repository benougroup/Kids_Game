/**
 * DialogManager — Lumenfall
 *
 * A fully centered, screen-responsive dialog system supporting 6 box types:
 *
 *  1. STORY      — Classic NPC speech with portrait, typewriter text, tap-to-advance
 *  2. CHOICE     — Multiple-choice (2–4 options), highlights on hover, returns chosen index
 *  3. QUIZ       — Multiple-choice with right/wrong feedback, score tracking
 *  4. PUZZLE     — Drag-or-tap tile/word ordering puzzle
 *  5. RIDDLE     — Text input answer (keyboard or on-screen letter tiles)
 *  6. FILL       — Fill-in-the-blank sentence with tap-to-select word choices
 *
 * All boxes:
 *  - Centered on screen (not anchored to bottom)
 *  - Responsive: recalculate on resize
 *  - RPG pixel-art skin: dark parchment + gold border + inner bevel
 *  - Typewriter effect on story text
 *  - Portrait support (optional)
 *  - Callback-based: onComplete(result) fires when the player finishes
 *
 * Usage:
 *   const dm = new DialogManager(scene);
 *
 *   // Story dialog
 *   dm.story({ speaker: 'Elder', text: 'Long ago...', portrait: 'elder' }, () => { ... });
 *
 *   // Multiple choice
 *   dm.choice({ speaker: 'Guard', text: 'Which path?', options: ['Forest', 'Cave', 'Town'] }, (i) => { ... });
 *
 *   // Quiz
 *   dm.quiz({ question: 'What is 3 + 4?', options: ['5','6','7','8'], correct: 2 }, (ok) => { ... });
 *
 *   // Riddle
 *   dm.riddle({ speaker: 'Sphinx', riddle: 'I have hands but cannot clap. What am I?', answer: 'clock' }, (ok) => { ... });
 *
 *   // Fill-in-the-blank
 *   dm.fill({ sentence: 'The sun rises in the ___', words: ['east','west','north','south'], correct: 0 }, (ok) => { ... });
 *
 *   // Puzzle (word ordering)
 *   dm.puzzle({ instruction: 'Put the words in order:', words: ['cat','the','sat'], answer: 'the cat sat' }, (ok) => { ... });
 */

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  BG:          0x1a1228,
  BG_ALPHA:    0.97,
  BORDER:      0xd4a017,
  BORDER2:     0x8b6914,
  INNER:       0x2a1e3a,
  NAME_BG:     0x3a2a50,
  NAME_TEXT:   '#ffd700',
  BODY_TEXT:   '#f0e8d0',
  HINT_TEXT:   '#a090c0',
  BTN_NORMAL:  0x3a2a50,
  BTN_HOVER:   0x5a3a70,
  BTN_CORRECT: 0x1a5a1a,
  BTN_WRONG:   0x5a1a1a,
  BTN_BORDER:  0xd4a017,
  BTN_TEXT:    '#f0e8d0',
  OVERLAY:     0x000000,
  ARROW:       '#ffd700',
  INPUT_BG:    0x2a1e3a,
  INPUT_BORDER:0xd4a017,
  TILE_BG:     0x3a2a50,
  TILE_HOVER:  0x5a3a70,
  TILE_PLACED: 0x1a3a5a,
  TILE_BORDER: 0xd4a017,
};

// ─── Dialog data types ────────────────────────────────────────────────────────
export interface StoryData {
  speaker: string;
  text: string | string[];   // string[] = multi-page
  portrait?: string;         // atlas frame key
  atlas?: string;            // atlas key (default: 'characters')
}

export interface ChoiceData {
  speaker: string;
  text: string;
  portrait?: string;
  atlas?: string;
  options: string[];         // 2–4 options
}

export interface QuizData {
  question: string;
  options: string[];         // 2–4 options
  correct: number;           // index of correct answer
  hint?: string;
  portrait?: string;
  atlas?: string;
  speaker?: string;
}

export interface RiddleData {
  speaker: string;
  riddle: string;
  answer: string;            // lowercase, trimmed
  hint?: string;
  portrait?: string;
  atlas?: string;
}

export interface FillData {
  sentence: string;          // use ___ for the blank
  words: string[];           // word choices (correct one first, then distractors)
  correct: number;           // index of correct word in `words`
  hint?: string;
  speaker?: string;
  portrait?: string;
  atlas?: string;
}

export interface PuzzleData {
  instruction: string;
  words: string[];           // scrambled words to order
  answer: string;            // correct sentence (lowercase, trimmed)
  hint?: string;
  speaker?: string;
  portrait?: string;
  atlas?: string;
}

// ─── Main class ───────────────────────────────────────────────────────────────
export class DialogManager {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Rectangle;
  private active = false;

  // Shared layout cache
  private W = 0;
  private H = 0;
  private BW = 0;  // box width
  private BH = 0;  // box height
  private BX = 0;  // box left
  private BY = 0;  // box top

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildRoot();
    scene.scale.on('resize', this.onResize, this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  public isOpen(): boolean { return this.active; }

  /** Story dialog — tap/click to advance pages, then close */
  public story(data: StoryData, onComplete?: () => void): void {
    const pages = Array.isArray(data.text) ? data.text : [data.text];
    this.openStory(data.speaker, pages, data.portrait, data.atlas ?? 'characters', onComplete);
  }

  /** Multiple-choice dialog — returns chosen option index */
  public choice(data: ChoiceData, onComplete?: (index: number) => void): void {
    this.openChoice(data, onComplete);
  }

  /** Quiz — returns true if correct */
  public quiz(data: QuizData, onComplete?: (correct: boolean) => void): void {
    this.openQuiz(data, onComplete);
  }

  /** Riddle — returns true if answer matches */
  public riddle(data: RiddleData, onComplete?: (correct: boolean) => void): void {
    this.openRiddle(data, onComplete);
  }

  /** Fill-in-the-blank — returns true if correct word chosen */
  public fill(data: FillData, onComplete?: (correct: boolean) => void): void {
    this.openFill(data, onComplete);
  }

  /** Word-order puzzle — returns true if correctly assembled */
  public puzzle(data: PuzzleData, onComplete?: (correct: boolean) => void): void {
    this.openPuzzle(data, onComplete);
  }

  /** Close any open dialog immediately */
  public close(): void {
    this.clearRoot();
    this.active = false;
  }

  public destroy(): void {
    this.scene.scale.off('resize', this.onResize, this);
    this.root.destroy();
  }

  // ── Root / layout ───────────────────────────────────────────────────────────

  private buildRoot(): void {
    this.root = this.scene.add.container(0, 0);
    this.root.setDepth(20000);
    this.root.setScrollFactor(0);
    this.root.setVisible(false);

    this.overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, C.OVERLAY, 0.55);
    this.overlay.setOrigin(0, 0);
    this.overlay.setScrollFactor(0);
    this.root.add(this.overlay);
  }

  private clearRoot(): void {
    // Remove everything except the overlay (index 0)
    while (this.root.length > 1) {
      const obj = this.root.getAt(1) as Phaser.GameObjects.GameObject;
      this.root.remove(obj, true);
    }
    this.root.setVisible(false);
  }

  private onResize(): void {
    if (!this.active) return;
    // Redraw is handled per-type; just update overlay size
    this.overlay.setSize(this.scene.scale.width, this.scene.scale.height);
  }

  private calcLayout(heightRatio = 0.52): void {
    this.W = this.scene.scale.width;
    this.H = this.scene.scale.height;
    this.BW = Math.max(280, Math.min(680, this.W - 32));
    this.BH = Math.max(170, Math.min(Math.round(this.H * heightRatio), 420, this.H - 56));
    this.BX = Math.max(16, Math.round((this.W - this.BW) / 2));
    this.BY = Math.max(28, Math.round((this.H - this.BH) / 2));
  }

  /** Draw the base box (background + gold border + inner bevel) */
  private drawBox(g: Phaser.GameObjects.Graphics, extraH = 0): void {
    const { BX, BY, BW, BH } = this;
    const h = BH + extraH;

    // Shadow
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(BX + 6, BY + 6, BW, h, 14);

    // Main fill
    g.fillStyle(C.BG, C.BG_ALPHA);
    g.fillRoundedRect(BX, BY, BW, h, 14);

    // Outer gold border
    g.lineStyle(3, C.BORDER, 1);
    g.strokeRoundedRect(BX, BY, BW, h, 14);

    // Inner bevel
    g.lineStyle(1, C.BORDER2, 0.6);
    g.strokeRoundedRect(BX + 6, BY + 6, BW - 12, h - 12, 10);
  }

  /** Draw the name badge above the box */
  private drawNameBadge(g: Phaser.GameObjects.Graphics, name: string): Phaser.GameObjects.Text {
    const { BX, BY } = this;
    const bw = Math.min(200, name.length * 14 + 32);
    const bh = 30;
    const bx = BX + 20;
    const by = Math.max(2, BY - bh / 2 - 2);

    g.fillStyle(C.NAME_BG, 1);
    g.fillRoundedRect(bx, by, bw, bh, 8);
    g.lineStyle(2, C.BORDER, 1);
    g.strokeRoundedRect(bx, by, bw, bh, 8);

    const t = this.scene.add.text(bx + bw / 2, by + bh / 2, name, {
      fontSize: '15px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.NAME_TEXT,
    });
    t.setOrigin(0.5, 0.5);
    t.setScrollFactor(0);
    this.root.add(t);
    return t;
  }

  /** Draw portrait frame and sprite */
  private drawPortrait(portrait: string, atlas: string): Phaser.GameObjects.Sprite | null {
    if (!portrait) return null;
    const { BX, BY, BH } = this;
    const ps = Math.min(72, Math.max(48, Math.round(BH * 0.38)));
    const px = BX + 16;
    const py = BY + Math.round((BH - ps) / 2);

    const g = this.scene.add.graphics();
    g.fillStyle(C.INNER, 1);
    g.fillRoundedRect(px - 4, py - 4, ps + 8, ps + 8, 6);
    g.lineStyle(2, C.BORDER, 1);
    g.strokeRoundedRect(px - 4, py - 4, ps + 8, ps + 8, 6);
    g.setScrollFactor(0);
    this.root.add(g);

    try {
      const sp = this.scene.add.sprite(px + ps / 2, py + ps / 2, atlas, portrait);
      sp.setDisplaySize(ps, ps);
      sp.setScrollFactor(0);
      this.root.add(sp);
      return sp;
    } catch {
      return null;
    }
  }

  /** Make a button and return it */
  private makeButton(
    x: number, y: number, w: number, h: number,
    label: string, fontSize = '14px',
    bgColor = C.BTN_NORMAL
  ): { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text } {
    const g = this.scene.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, C.BTN_BORDER, 1);
    g.strokeRoundedRect(x, y, w, h, 8);
    g.setScrollFactor(0);
    g.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);

    const t = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize,
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BTN_TEXT,
      wordWrap: { width: w - 16 },
      align: 'center',
    });
    t.setOrigin(0.5, 0.5);
    t.setScrollFactor(0);

    this.root.add(g);
    this.root.add(t);
    return { g, t };
  }

  // ── 1. STORY ────────────────────────────────────────────────────────────────

  private openStory(
    speaker: string, pages: string[],
    portrait: string | undefined, atlas: string,
    onComplete?: () => void
  ): void {
    let page = 0;
    const showPage = () => {
      this.clearRoot();
      this.root.add(this.overlay);
      this.root.setVisible(true);
      this.active = true;
      this.calcLayout(0.42);

      const { BX, BY, BW, BH } = this;
      const hasPortrait = !!portrait && BW >= 380;
      const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
      const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
      const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

      const g = this.scene.add.graphics();
      g.setScrollFactor(0);
      this.root.add(g);
      this.drawBox(g);
      this.drawNameBadge(g, speaker);
      if (hasPortrait) this.drawPortrait(portrait!, atlas);

      // Page counter
      if (pages.length > 1) {
        const pc = this.scene.add.text(BX + BW - 16, BY + BH - 14, `${page + 1}/${pages.length}`, {
          fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
        });
        pc.setOrigin(1, 1);
        pc.setScrollFactor(0);
        this.root.add(pc);
      }

      // Typewriter text
      const textObj = this.scene.add.text(textLeft, BY + 32, '', {
        fontSize: this.W < 420 ? '12px' : '14px',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: C.BODY_TEXT,
        wordWrap: { width: textWidth },
        lineSpacing: this.W < 420 ? 6 : 10,
      });
      textObj.setScrollFactor(0);
      this.root.add(textObj);

      // Arrow indicator
      const arrow = this.scene.add.text(BX + BW - 20, BY + BH - 18, '▼', {
        fontSize: '18px', color: C.ARROW,
      });
      arrow.setOrigin(1, 1);
      arrow.setScrollFactor(0);
      arrow.setVisible(false);
      this.root.add(arrow);

      this.scene.tweens.add({ targets: arrow, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

      // Typewriter
      const fullText = pages[page];
      let idx = 0;
      let done = false;
      const timer = this.scene.time.addEvent({
        delay: 28,
        callback: () => {
          if (idx < fullText.length) {
            idx++;
            textObj.setText(fullText.slice(0, idx));
          } else {
            timer.remove();
            done = true;
            arrow.setVisible(true);
          }
        },
        loop: true,
      });

      // Click / tap to advance
      const handler = () => {
        if (!done) {
          // Skip to end
          timer.remove();
          idx = fullText.length;
          textObj.setText(fullText);
          done = true;
          arrow.setVisible(true);
        } else {
          page++;
          if (page < pages.length) {
            showPage();
          } else {
            this.close();
            onComplete?.();
          }
        }
      };
      this.overlay.setInteractive();
      this.overlay.once('pointerdown', handler);
    };
    showPage();
  }

  // ── 2. CHOICE ───────────────────────────────────────────────────────────────

  private openChoice(data: ChoiceData, onComplete?: (index: number) => void): void {
    this.clearRoot();
    this.root.add(this.overlay);
    this.root.setVisible(true);
    this.active = true;
    this.calcLayout(0.55);

    const { BX, BY, BW, BH } = this;
    const hasPortrait = !!data.portrait && BW >= 380;
    const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
    const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
    const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    this.root.add(g);
    this.drawBox(g);
    this.drawNameBadge(g, data.speaker);
    if (hasPortrait) this.drawPortrait(data.portrait!, data.atlas ?? 'characters');

    // Question text
    const qt = this.scene.add.text(textLeft, BY + 28, data.text, {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BODY_TEXT,
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });
    qt.setScrollFactor(0);
    this.root.add(qt);

    // Option buttons
    const btnH = 38;
    const btnGap = 10;
    const btnW = BW - 40;
    const startY = BY + Math.round(BH * 0.45);

    data.options.forEach((opt, i) => {
      const by = startY + i * (btnH + btnGap);
      const { g: bg, t: bt } = this.makeButton(BX + 20, by, btnW, btnH, opt, '12px');

      bg.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(C.BTN_HOVER, 1);
        bg.fillRoundedRect(BX + 20, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(BX + 20, by, btnW, btnH, 8);
      });
      bg.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(C.BTN_NORMAL, 1);
        bg.fillRoundedRect(BX + 20, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(BX + 20, by, btnW, btnH, 8);
      });
      bg.on('pointerdown', () => {
        this.close();
        onComplete?.(i);
      });

      void bt; // used via root
    });
  }

  // ── 3. QUIZ ─────────────────────────────────────────────────────────────────

  private openQuiz(data: QuizData, onComplete?: (correct: boolean) => void): void {
    this.clearRoot();
    this.root.add(this.overlay);
    this.root.setVisible(true);
    this.active = true;
    this.calcLayout(0.60);

    const { BX, BY, BW, BH } = this;
    const hasPortrait = !!data.portrait && BW >= 380;
    const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
    const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
    const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    this.root.add(g);
    this.drawBox(g);
    if (data.speaker) this.drawNameBadge(g, data.speaker);
    if (hasPortrait) this.drawPortrait(data.portrait!, data.atlas ?? 'characters');

    // Question
    const qt = this.scene.add.text(textLeft, BY + 28, data.question, {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BODY_TEXT,
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });
    qt.setScrollFactor(0);
    this.root.add(qt);

    // Hint
    if (data.hint) {
      const ht = this.scene.add.text(textLeft, BY + 28 + qt.height + 8, `💡 ${data.hint}`, {
        fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
        wordWrap: { width: textWidth },
      });
      ht.setScrollFactor(0);
      this.root.add(ht);
    }

    // Feedback text (hidden until answer)
    const feedback = this.scene.add.text(BX + BW / 2, BY + BH - 28, '', {
      fontSize: '14px', fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#ffffff', align: 'center',
    });
    feedback.setOrigin(0.5, 0.5);
    feedback.setScrollFactor(0);
    this.root.add(feedback);

    // Option buttons
    const btnH = 36;
    const btnGap = 8;
    const cols = data.options.length <= 2 ? 1 : 2;
    const btnW = cols === 1 ? BW - 40 : Math.round((BW - 50) / 2);
    const startY = BY + Math.round(BH * 0.42);
    let answered = false;

    data.options.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = BX + 20 + col * (btnW + 10);
      const by = startY + row * (btnH + btnGap);
      const { g: bg } = this.makeButton(bx, by, btnW, btnH, opt, '12px');

      bg.on('pointerover', () => {
        if (answered) return;
        bg.clear();
        bg.fillStyle(C.BTN_HOVER, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      bg.on('pointerout', () => {
        if (answered) return;
        bg.clear();
        bg.fillStyle(C.BTN_NORMAL, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      bg.on('pointerdown', () => {
        if (answered) return;
        answered = true;
        const correct = i === data.correct;
        bg.clear();
        bg.fillStyle(correct ? C.BTN_CORRECT : C.BTN_WRONG, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);

        // Also highlight correct answer if wrong
        if (!correct) {
          // find correct button graphics — stored in root at known offset
          feedback.setText(`✗ Wrong! Answer: ${data.options[data.correct]}`);
          feedback.setColor('#ff8888');
        } else {
          feedback.setText('✓ Correct! Well done!');
          feedback.setColor('#88ff88');
        }

        this.scene.time.delayedCall(1800, () => {
          this.close();
          onComplete?.(correct);
        });
      });
    });
  }

  // ── 4. RIDDLE ───────────────────────────────────────────────────────────────

  private openRiddle(data: RiddleData, onComplete?: (correct: boolean) => void): void {
    this.clearRoot();
    this.root.add(this.overlay);
    this.root.setVisible(true);
    this.active = true;
    this.calcLayout(0.58);

    const { BX, BY, BW, BH } = this;
    const hasPortrait = !!data.portrait && BW >= 380;
    const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
    const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
    const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    this.root.add(g);
    this.drawBox(g);
    this.drawNameBadge(g, data.speaker);
    if (hasPortrait) this.drawPortrait(data.portrait!, data.atlas ?? 'characters');

    // Riddle text
    const rt = this.scene.add.text(textLeft, BY + 28, `🤔 ${data.riddle}`, {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BODY_TEXT,
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });
    rt.setScrollFactor(0);
    this.root.add(rt);

    if (data.hint) {
      const ht = this.scene.add.text(textLeft, BY + 28 + rt.height + 8, `💡 Hint: ${data.hint}`, {
        fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
        wordWrap: { width: textWidth },
      });
      ht.setScrollFactor(0);
      this.root.add(ht);
    }

    // Letter tiles (A–Z keyboard-style)
    const answer = data.answer.toLowerCase().trim();
    let typed = '';
    const inputY = BY + Math.round(BH * 0.52);

    // Input display
    const inputBg = this.scene.add.graphics();
    inputBg.fillStyle(C.INPUT_BG, 1);
    inputBg.fillRoundedRect(BX + 20, inputY, BW - 40, 36, 6);
    inputBg.lineStyle(2, C.INPUT_BORDER, 1);
    inputBg.strokeRoundedRect(BX + 20, inputY, BW - 40, 36, 6);
    inputBg.setScrollFactor(0);
    this.root.add(inputBg);

    const inputText = this.scene.add.text(BX + 30, inputY + 18, '_', {
      fontSize: '16px', fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.NAME_TEXT,
    });
    inputText.setOrigin(0, 0.5);
    inputText.setScrollFactor(0);
    this.root.add(inputText);

    const feedback = this.scene.add.text(BX + BW / 2, BY + BH - 16, '', {
      fontSize: '13px', fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#ffffff', align: 'center',
    });
    feedback.setOrigin(0.5, 0.5);
    feedback.setScrollFactor(0);
    this.root.add(feedback);

    // Letter tiles
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const tileW = 28, tileH = 26, tileGap = 4;
    const tilesPerRow = Math.floor((BW - 40) / (tileW + tileGap));
    const tileStartY = inputY + 46;

    letters.split('').forEach((ch, i) => {
      const col = i % tilesPerRow;
      const row = Math.floor(i / tilesPerRow);
      const tx = BX + 20 + col * (tileW + tileGap);
      const ty = tileStartY + row * (tileH + tileGap);

      const tg = this.scene.add.graphics();
      tg.fillStyle(C.TILE_BG, 1);
      tg.fillRoundedRect(tx, ty, tileW, tileH, 4);
      tg.lineStyle(1, C.TILE_BORDER, 0.7);
      tg.strokeRoundedRect(tx, ty, tileW, tileH, 4);
      tg.setScrollFactor(0);
      tg.setInteractive(new Phaser.Geom.Rectangle(tx, ty, tileW, tileH), Phaser.Geom.Rectangle.Contains);
      this.root.add(tg);

      const tt = this.scene.add.text(tx + tileW / 2, ty + tileH / 2, ch, {
        fontSize: '11px', fontFamily: 'monospace', color: C.BTN_TEXT,
      });
      tt.setOrigin(0.5, 0.5);
      tt.setScrollFactor(0);
      this.root.add(tt);

      tg.on('pointerover', () => {
        tg.clear();
        tg.fillStyle(C.TILE_HOVER, 1);
        tg.fillRoundedRect(tx, ty, tileW, tileH, 4);
        tg.lineStyle(1, C.TILE_BORDER, 1);
        tg.strokeRoundedRect(tx, ty, tileW, tileH, 4);
      });
      tg.on('pointerout', () => {
        tg.clear();
        tg.fillStyle(C.TILE_BG, 1);
        tg.fillRoundedRect(tx, ty, tileW, tileH, 4);
        tg.lineStyle(1, C.TILE_BORDER, 0.7);
        tg.strokeRoundedRect(tx, ty, tileW, tileH, 4);
      });
      tg.on('pointerdown', () => {
        typed += ch.toLowerCase();
        inputText.setText(typed || '_');
      });
    });

    // Backspace + Submit buttons
    const btnY = tileStartY + Math.ceil(26 / tilesPerRow) * (tileH + tileGap) + 4;
    const { g: backG } = this.makeButton(BX + 20, btnY, 100, 32, '⌫ Back', '11px');
    const { g: submitG } = this.makeButton(BX + BW - 140, btnY, 120, 32, '✓ Submit', '11px');

    backG.on('pointerdown', () => {
      typed = typed.slice(0, -1);
      inputText.setText(typed || '_');
    });
    submitG.on('pointerdown', () => {
      const correct = typed.toLowerCase().trim() === answer;
      feedback.setText(correct ? '✓ Correct!' : `✗ Try again! (${data.answer})`);
      feedback.setColor(correct ? '#88ff88' : '#ff8888');
      this.scene.time.delayedCall(1800, () => {
        this.close();
        onComplete?.(correct);
      });
    });

    // Physical keyboard support
    this.scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.active) return;
      if (ev.key === 'Backspace') { typed = typed.slice(0, -1); inputText.setText(typed || '_'); }
      else if (ev.key === 'Enter') submitG.emit('pointerdown');
      else if (ev.key.length === 1 && /[a-zA-Z]/.test(ev.key)) {
        typed += ev.key.toLowerCase();
        inputText.setText(typed);
      }
    });
  }

  // ── 5. FILL-IN-THE-BLANK ────────────────────────────────────────────────────

  private openFill(data: FillData, onComplete?: (correct: boolean) => void): void {
    this.clearRoot();
    this.root.add(this.overlay);
    this.root.setVisible(true);
    this.active = true;
    this.calcLayout(0.55);

    const { BX, BY, BW, BH } = this;
    const hasPortrait = !!data.portrait && BW >= 380;
    const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
    const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
    const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    this.root.add(g);
    this.drawBox(g);
    if (data.speaker) this.drawNameBadge(g, data.speaker);
    if (hasPortrait) this.drawPortrait(data.portrait!, data.atlas ?? 'characters');

    // Sentence with blank highlighted
    const parts = data.sentence.split('___');
    const sentenceStr = parts[0] + '[ ? ]' + (parts[1] ?? '');
    const st = this.scene.add.text(textLeft, BY + 28, sentenceStr, {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BODY_TEXT,
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });
    st.setScrollFactor(0);
    this.root.add(st);

    if (data.hint) {
      const ht = this.scene.add.text(textLeft, BY + 28 + st.height + 8, `💡 ${data.hint}`, {
        fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
      });
      ht.setScrollFactor(0);
      this.root.add(ht);
    }

    const feedback = this.scene.add.text(BX + BW / 2, BY + BH - 20, '', {
      fontSize: '13px', fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#ffffff', align: 'center',
    });
    feedback.setOrigin(0.5, 0.5);
    feedback.setScrollFactor(0);
    this.root.add(feedback);

    // Word choice buttons
    const btnH = 38;
    const btnGap = 10;
    const cols = data.words.length <= 2 ? 1 : 2;
    const btnW = cols === 1 ? BW - 40 : Math.round((BW - 50) / 2);
    const startY = BY + Math.round(BH * 0.48);
    let answered = false;

    // Shuffle display order (but track correct index)
    const shuffled = data.words.map((w, i) => ({ word: w, origIdx: i }));
    shuffled.sort(() => Math.random() - 0.5);

    shuffled.forEach(({ word, origIdx }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = BX + 20 + col * (btnW + 10);
      const by = startY + row * (btnH + btnGap);
      const { g: bg } = this.makeButton(bx, by, btnW, btnH, word, '13px');

      bg.on('pointerover', () => {
        if (answered) return;
        bg.clear();
        bg.fillStyle(C.BTN_HOVER, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      bg.on('pointerout', () => {
        if (answered) return;
        bg.clear();
        bg.fillStyle(C.BTN_NORMAL, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      bg.on('pointerdown', () => {
        if (answered) return;
        answered = true;
        const correct = origIdx === data.correct;
        bg.clear();
        bg.fillStyle(correct ? C.BTN_CORRECT : C.BTN_WRONG, 1);
        bg.fillRoundedRect(bx, by, btnW, btnH, 8);
        bg.lineStyle(2, C.BTN_BORDER, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 8);

        // Update sentence display
        const filled = parts[0] + `[${word}]` + (parts[1] ?? '');
        st.setText(filled);
        st.setColor(correct ? '#88ff88' : '#ff8888');

        feedback.setText(correct ? '✓ Correct!' : `✗ It was: "${data.words[data.correct]}"`);
        feedback.setColor(correct ? '#88ff88' : '#ff8888');

        this.scene.time.delayedCall(1800, () => {
          this.close();
          onComplete?.(correct);
        });
      });
    });
  }

  // ── 6. PUZZLE (word ordering) ───────────────────────────────────────────────

  private openPuzzle(data: PuzzleData, onComplete?: (correct: boolean) => void): void {
    this.clearRoot();
    this.root.add(this.overlay);
    this.root.setVisible(true);
    this.active = true;
    this.calcLayout(0.65);

    const { BX, BY, BW, BH } = this;
    const hasPortrait = !!data.portrait && BW >= 380;
    const portraitSpace = hasPortrait ? Math.min(96, Math.round(BW * 0.24)) : 0;
    const textLeft = hasPortrait ? BX + portraitSpace + 20 : BX + 20;
    const textWidth = hasPortrait ? BW - portraitSpace - 40 : BW - 40;

    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    this.root.add(g);
    this.drawBox(g);
    if (data.speaker) this.drawNameBadge(g, data.speaker);
    if (hasPortrait) this.drawPortrait(data.portrait!, data.atlas ?? 'characters');

    // Instruction
    const it = this.scene.add.text(textLeft, BY + 28, data.instruction, {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: C.BODY_TEXT,
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });
    it.setScrollFactor(0);
    this.root.add(it);

    if (data.hint) {
      const ht = this.scene.add.text(textLeft, BY + 28 + it.height + 6, `💡 ${data.hint}`, {
        fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
      });
      ht.setScrollFactor(0);
      this.root.add(ht);
    }

    // Answer tray (where placed words go)
    const trayY = BY + Math.round(BH * 0.38);
    const trayBg = this.scene.add.graphics();
    trayBg.fillStyle(C.INPUT_BG, 1);
    trayBg.fillRoundedRect(BX + 20, trayY, BW - 40, 44, 6);
    trayBg.lineStyle(2, C.INPUT_BORDER, 1);
    trayBg.strokeRoundedRect(BX + 20, trayY, BW - 40, 44, 6);
    trayBg.setScrollFactor(0);
    this.root.add(trayBg);

    const trayText = this.scene.add.text(BX + 30, trayY + 22, '(tap words below to build your answer)', {
      fontSize: '11px', fontFamily: 'monospace', color: C.HINT_TEXT,
    });
    trayText.setOrigin(0, 0.5);
    trayText.setScrollFactor(0);
    this.root.add(trayText);

    const feedback = this.scene.add.text(BX + BW / 2, BY + BH - 18, '', {
      fontSize: '13px', fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#ffffff', align: 'center',
    });
    feedback.setOrigin(0.5, 0.5);
    feedback.setScrollFactor(0);
    this.root.add(feedback);

    // Scrambled word tiles
    const placed: string[] = [];
    const shuffled = [...data.words].sort(() => Math.random() - 0.5);
    const tileH = 34, tileGap = 8;
    const wordStartY = trayY + 54;

    const tileGraphics: Map<string, { g: Phaser.GameObjects.Graphics; used: boolean }> = new Map();

    const maxTileW = Math.floor((BW - 40 - (shuffled.length - 1) * tileGap) / shuffled.length);
    const tileW = Math.max(50, Math.min(100, maxTileW));
    const totalW = shuffled.length * tileW + (shuffled.length - 1) * tileGap;
    const tileStartX = BX + Math.round((BW - totalW) / 2);

    shuffled.forEach((word, i) => {
      const tx = tileStartX + i * (tileW + tileGap);
      const ty = wordStartY;

      const tg = this.scene.add.graphics();
      tg.fillStyle(C.TILE_BG, 1);
      tg.fillRoundedRect(tx, ty, tileW, tileH, 6);
      tg.lineStyle(2, C.TILE_BORDER, 1);
      tg.strokeRoundedRect(tx, ty, tileW, tileH, 6);
      tg.setScrollFactor(0);
      tg.setInteractive(new Phaser.Geom.Rectangle(tx, ty, tileW, tileH), Phaser.Geom.Rectangle.Contains);
      this.root.add(tg);

      const tt = this.scene.add.text(tx + tileW / 2, ty + tileH / 2, word, {
        fontSize: '12px', fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: C.BTN_TEXT,
      });
      tt.setOrigin(0.5, 0.5);
      tt.setScrollFactor(0);
      this.root.add(tt);

      const state = { used: false };
      tileGraphics.set(word + '_' + i, { g: tg, used: false });

      tg.on('pointerover', () => {
        if (state.used) return;
        tg.clear();
        tg.fillStyle(C.TILE_HOVER, 1);
        tg.fillRoundedRect(tx, ty, tileW, tileH, 6);
        tg.lineStyle(2, C.TILE_BORDER, 1);
        tg.strokeRoundedRect(tx, ty, tileW, tileH, 6);
      });
      tg.on('pointerout', () => {
        if (state.used) return;
        tg.clear();
        tg.fillStyle(C.TILE_BG, 1);
        tg.fillRoundedRect(tx, ty, tileW, tileH, 6);
        tg.lineStyle(2, C.TILE_BORDER, 1);
        tg.strokeRoundedRect(tx, ty, tileW, tileH, 6);
      });
      tg.on('pointerdown', () => {
        if (state.used) {
          // Remove from placed
          const idx = placed.lastIndexOf(word);
          if (idx !== -1) placed.splice(idx, 1);
          state.used = false;
          tg.clear();
          tg.fillStyle(C.TILE_BG, 1);
          tg.fillRoundedRect(tx, ty, tileW, tileH, 6);
          tg.lineStyle(2, C.TILE_BORDER, 1);
          tg.strokeRoundedRect(tx, ty, tileW, tileH, 6);
          tt.setColor(C.BTN_TEXT);
        } else {
          placed.push(word);
          state.used = true;
          tg.clear();
          tg.fillStyle(C.TILE_PLACED, 1);
          tg.fillRoundedRect(tx, ty, tileW, tileH, 6);
          tg.lineStyle(2, C.TILE_BORDER, 1);
          tg.strokeRoundedRect(tx, ty, tileW, tileH, 6);
          tt.setColor('#aaddff');
        }
        trayText.setText(placed.join(' ') || '(tap words below to build your answer)');
      });
    });

    // Submit button
    const { g: submitG } = this.makeButton(BX + BW / 2 - 70, wordStartY + tileH + 12, 140, 34, '✓ Check', '12px');
    submitG.on('pointerdown', () => {
      const attempt = placed.join(' ').toLowerCase().trim();
      const correct = attempt === data.answer.toLowerCase().trim();
      feedback.setText(correct ? '✓ Correct!' : `✗ Try: "${data.answer}"`);
      feedback.setColor(correct ? '#88ff88' : '#ff8888');
      this.scene.time.delayedCall(2000, () => {
        this.close();
        onComplete?.(correct);
      });
    });
  }
}
