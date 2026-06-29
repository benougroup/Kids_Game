/**
 * Math Mini-Game System
 * 
 * NPCs can trigger timed math challenges.
 * - Multiple choice answers
 * - Countdown timer (10-30 seconds)
 * - Difficulty scales with story stage
 * - Correct = reward (XP, items, story progress)
 * - Wrong = penalty (HP loss, time penalty)
 * - Time out = penalty
 * 
 * Question types by difficulty:
 *   Level 1: Addition/Subtraction (1-10)
 *   Level 2: Addition/Subtraction (1-20), Multiplication (2-5 tables)
 *   Level 3: All operations (1-50), Multiplication (2-10 tables)
 *   Level 4: Division, Mixed operations, Word problems
 *   Level 5: Multi-step problems, Fractions
 */

export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface MathQuestion {
  text: string;
  answer: number;
  choices: number[];
  operation: MathOperation;
  difficulty: number;
  timeLimit: number;  // seconds
}

export interface MathResult {
  correct: boolean;
  timeTaken: number;
  question: MathQuestion;
  reward?: MathReward;
}

export interface MathReward {
  xp: number;
  hp?: number;       // HP restored
  magic?: number;    // Magic restored
  message: string;
}

export class MathGameSystem {
  private scene: Phaser.Scene;
  
  // UI elements
  private container: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private questionText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private timerBar: Phaser.GameObjects.Rectangle | null = null;
  private timerBarBg: Phaser.GameObjects.Rectangle | null = null;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private resultText: Phaser.GameObjects.Text | null = null;
  private npcNameText: Phaser.GameObjects.Text | null = null;
  
  // State
  private currentQuestion: MathQuestion | null = null;
  private isActive: boolean = false;
  private timeRemaining: number = 0;
  private onComplete: ((result: MathResult) => void) | null = null;
  private startTime: number = 0;
  
  private currentBoxWidth: number = 600;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.scene.scale.on('resize', this.layoutUI, this);
  }

  private createUI(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const boxY = cy - 190;

    // Main container (fixed to camera)
    this.container = this.scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(9000);
    this.container.setVisible(false);

    // Dark overlay
    const overlay = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.6);
    overlay.setData('role', 'overlay');
    this.container.add(overlay);

    // Main box
    this.bg = this.scene.add.rectangle(cx, cy, 600, 380, 0x1a1a2e, 0.98);
    this.bg.setStrokeStyle(3, 0x4488ff);
    this.container.add(this.bg);

    // Title bar
    const titleBar = this.scene.add.rectangle(cx, boxY + 30, 600, 50, 0x16213e);
    titleBar.setData('role', 'titleBar');
    this.container.add(titleBar);

    // NPC name
    this.npcNameText = this.scene.add.text(cx, boxY + 30, 'Math Challenge!', {
      fontSize: '20px',
      color: '#ffdd44',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.npcNameText);

    // Timer bar background
    this.timerBarBg = this.scene.add.rectangle(cx, boxY + 70, 560, 16, 0x333333);
    this.container.add(this.timerBarBg);

    // Timer bar (fills from left to right)
    this.timerBar = this.scene.add.rectangle(cx, boxY + 70, 560, 16, 0x44ff44);
    this.timerBar.setOrigin(0.5, 0.5);
    this.container.add(this.timerBar);

    // Timer text
    this.timerText = this.scene.add.text(cx, boxY + 70, '30', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.timerText);

    // Question text
    this.questionText = this.scene.add.text(cx, cy - 60, '', {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.questionText);

    // Result text (shown after answer)
    this.resultText = this.scene.add.text(cx, cy + 10, '', {
      fontSize: '24px',
      color: '#44ff44',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.resultText);

    // Choice buttons (4 choices in 2x2 grid)
    for (let i = 0; i < 4; i++) {
      const btn = this.createChoiceButton(cx, cy, 220, 60, i);
      this.choiceButtons.push(btn);
      this.container.add(btn);
    }
    this.layoutUI();
  }

  private createChoiceButton(x: number, y: number, w: number, h: number, index: number): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x2244aa, 1);
    bg.setStrokeStyle(2, 0x4488ff);
    bg.setInteractive({ useHandCursor: true });
    
    const text = this.scene.add.text(0, 0, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    btn.add([bg, text]);
    btn.setData('bg', bg);
    btn.setData('text', text);
    btn.setData('index', index);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setFillStyle(0x3366cc);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x2244aa);
    });
    bg.on('pointerdown', () => {
      if (this.isActive && this.currentQuestion) {
        this.handleAnswer(index);
      }
    });

    return btn;
  }

  private layoutUI(): void {
    if (!this.container || !this.bg || !this.timerBarBg || !this.timerBar || !this.timerText || !this.questionText || !this.resultText || !this.npcNameText) return;
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    const cx = screenW / 2;
    const cy = screenH / 2;
    const boxW = Math.min(680, screenW - 24);
    const boxH = Math.min(420, Math.max(280, screenH - 48));
    const boxY = cy - boxH / 2;
    this.currentBoxWidth = boxW;

    const overlay = this.container.list.find((obj) => obj.getData('role') === 'overlay') as Phaser.GameObjects.Rectangle | undefined;
    const titleBar = this.container.list.find((obj) => obj.getData('role') === 'titleBar') as Phaser.GameObjects.Rectangle | undefined;
    if (overlay) {
      overlay.setPosition(cx, cy);
      overlay.setSize(screenW, screenH);
    }

    this.bg.setPosition(cx, cy);
    this.bg.setSize(boxW, boxH);
    if (titleBar) {
      titleBar.setPosition(cx, boxY + 28);
      titleBar.setSize(boxW, 48);
    }

    this.npcNameText.setPosition(cx, boxY + 28);
    this.timerBarBg.setPosition(cx, boxY + 62);
    this.timerBarBg.setSize(boxW - 30, 14);
    this.timerBar.setPosition(cx, boxY + 62);
    this.timerBar.setSize(boxW - 30, 14);
    this.timerText.setPosition(cx, boxY + 62);

    this.questionText.setPosition(cx, cy - Math.min(56, boxH * 0.2));
    this.questionText.setStyle({ fontSize: screenW < 600 ? '28px' : '36px' });
    this.resultText.setPosition(cx, cy + 12);

    const btnW = Math.min(240, Math.floor((boxW - 64) / 2));
    const btnH = screenH < 520 ? 52 : 60;
    const rowGap = screenH < 520 ? 62 : 74;
    const row1Y = cy + Math.min(84, boxH * 0.22);
    const row2Y = row1Y + rowGap;
    const leftX = cx - (btnW / 2) - 12;
    const rightX = cx + (btnW / 2) + 12;
    const pos = [
      { x: leftX, y: row1Y },
      { x: rightX, y: row1Y },
      { x: leftX, y: row2Y },
      { x: rightX, y: row2Y },
    ];

    this.choiceButtons.forEach((btn, i) => {
      btn.setPosition(pos[i].x, pos[i].y);
      const bg = btn.getData('bg') as Phaser.GameObjects.Rectangle;
      const text = btn.getData('text') as Phaser.GameObjects.Text;
      bg.setSize(btnW, btnH);
      text.setStyle({ fontSize: screenW < 600 ? '22px' : '28px' });
    });
  }

  /**
   * Generate a math question based on difficulty level
   */
  public generateQuestion(difficulty: number): MathQuestion {
    difficulty = Math.max(1, Math.min(5, difficulty));
    
    let a: number, b: number, answer: number, text: string;
    let operation: MathOperation;
    let timeLimit: number;

    switch (difficulty) {
      case 1:
        // Simple addition/subtraction 1-10
        operation = Math.random() < 0.5 ? 'add' : 'subtract';
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        if (operation === 'subtract') {
          if (b > a) [a, b] = [b, a]; // Ensure positive result
        }
        answer = operation === 'add' ? a + b : a - b;
        text = operation === 'add' ? `${a} + ${b} = ?` : `${a} - ${b} = ?`;
        timeLimit = 20;
        break;

      case 2:
        // Addition/subtraction 1-20, multiplication 2-5
        const ops2: MathOperation[] = ['add', 'subtract', 'multiply'];
        operation = ops2[Math.floor(Math.random() * ops2.length)];
        if (operation === 'multiply') {
          a = Math.floor(Math.random() * 4) + 2; // 2-5
          b = Math.floor(Math.random() * 10) + 1; // 1-10
          answer = a * b;
          text = `${a} × ${b} = ?`;
        } else {
          a = Math.floor(Math.random() * 20) + 1;
          b = Math.floor(Math.random() * 20) + 1;
          if (operation === 'subtract' && b > a) [a, b] = [b, a];
          answer = operation === 'add' ? a + b : a - b;
          text = operation === 'add' ? `${a} + ${b} = ?` : `${a} - ${b} = ?`;
        }
        timeLimit = 25;
        break;

      case 3:
        // All operations, larger numbers
        const ops3: MathOperation[] = ['add', 'subtract', 'multiply', 'divide'];
        operation = ops3[Math.floor(Math.random() * ops3.length)];
        if (operation === 'multiply') {
          a = Math.floor(Math.random() * 9) + 2; // 2-10
          b = Math.floor(Math.random() * 9) + 2; // 2-10
          answer = a * b;
          text = `${a} × ${b} = ?`;
        } else if (operation === 'divide') {
          b = Math.floor(Math.random() * 9) + 2; // 2-10
          answer = Math.floor(Math.random() * 9) + 2; // 2-10
          a = b * answer; // Ensure clean division
          text = `${a} ÷ ${b} = ?`;
        } else {
          a = Math.floor(Math.random() * 50) + 1;
          b = Math.floor(Math.random() * 50) + 1;
          if (operation === 'subtract' && b > a) [a, b] = [b, a];
          answer = operation === 'add' ? a + b : a - b;
          text = operation === 'add' ? `${a} + ${b} = ?` : `${a} - ${b} = ?`;
        }
        timeLimit = 20;
        break;

      case 4:
        // Mixed operations, word problems
        operation = Math.random() < 0.5 ? 'multiply' : 'divide';
        if (operation === 'multiply') {
          a = Math.floor(Math.random() * 12) + 3;
          b = Math.floor(Math.random() * 12) + 3;
          answer = a * b;
          text = `${a} × ${b} = ?`;
        } else {
          b = Math.floor(Math.random() * 11) + 2;
          answer = Math.floor(Math.random() * 11) + 2;
          a = b * answer;
          text = `${a} ÷ ${b} = ?`;
        }
        timeLimit = 15;
        break;

      case 5:
      default:
        // Hard: two-step problems
        operation = 'add';
        const x = Math.floor(Math.random() * 10) + 2;
        const y2 = Math.floor(Math.random() * 10) + 2;
        const z = Math.floor(Math.random() * 5) + 1;
        answer = x * y2 + z;
        text = `${x} × ${y2} + ${z} = ?`;
        timeLimit = 15;
        break;
    }

    // Generate wrong choices (3 wrong + 1 correct)
    const choices = this.generateChoices(answer, difficulty);

    return {
      text,
      answer,
      choices,
      operation,
      difficulty,
      timeLimit,
    };
  }

  private generateChoices(answer: number, _difficulty: number): number[] {
    const choices = new Set<number>([answer]);
    const spread = Math.max(3, Math.floor(answer * 0.3));
    
    while (choices.size < 4) {
      let wrong: number;
      const r = Math.random();
      
      if (r < 0.4) {
        // Close to answer
        wrong = answer + (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      } else if (r < 0.7) {
        // Moderate distance
        wrong = answer + (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * spread) + 1);
      } else {
        // Random in range
        wrong = Math.max(0, answer + (Math.random() < 0.5 ? 1 : -1) * Math.floor(Math.random() * spread * 2));
      }
      
      if (wrong !== answer && wrong >= 0) {
        choices.add(wrong);
      }
    }
    
    // Shuffle
    return Array.from(choices).sort(() => Math.random() - 0.5);
  }

  /**
   * Start a math challenge
   */
  public startChallenge(
    npcName: string,
    difficulty: number,
    onComplete: (result: MathResult) => void
  ): void {
    if (this.isActive) return;
    
    this.currentQuestion = this.generateQuestion(difficulty);
    this.onComplete = onComplete;
    this.timeRemaining = this.currentQuestion.timeLimit;
    this.startTime = Date.now();
    this.isActive = true;

    // Update UI
    if (this.npcNameText) this.npcNameText.setText(`${npcName} asks:`);
    if (this.questionText) this.questionText.setText(this.currentQuestion.text);
    if (this.resultText) this.resultText.setText('');

    // Update choice buttons
    for (let i = 0; i < 4; i++) {
      const btn = this.choiceButtons[i];
      const text = btn.getData('text') as Phaser.GameObjects.Text;
      const bg = btn.getData('bg') as Phaser.GameObjects.Rectangle;
      text.setText(String(this.currentQuestion.choices[i]));
      bg.setFillStyle(0x2244aa);
      bg.setStrokeStyle(2, 0x4488ff);
    }

    if (this.container) this.container.setVisible(true);
  }

  private handleAnswer(choiceIndex: number): void {
    if (!this.isActive || !this.currentQuestion) return;
    
    const chosen = this.currentQuestion.choices[choiceIndex];
    const correct = chosen === this.currentQuestion.answer;
    const timeTaken = (Date.now() - this.startTime) / 1000;
    
    // Visual feedback
    const btn = this.choiceButtons[choiceIndex];
    const bg = btn.getData('bg') as Phaser.GameObjects.Rectangle;
    
    if (correct) {
      bg.setFillStyle(0x44aa44);
      bg.setStrokeStyle(2, 0x44ff44);
      if (this.resultText) {
        this.resultText.setText('✓ Correct!').setColor('#44ff44');
      }
    } else {
      bg.setFillStyle(0xaa2222);
      bg.setStrokeStyle(2, 0xff4444);
      if (this.resultText) {
        this.resultText.setText(`✗ Wrong! Answer: ${this.currentQuestion.answer}`).setColor('#ff4444');
      }
      // Show correct answer
      for (let i = 0; i < 4; i++) {
        if (this.currentQuestion.choices[i] === this.currentQuestion.answer) {
          const correctBtn = this.choiceButtons[i];
          const correctBg = correctBtn.getData('bg') as Phaser.GameObjects.Rectangle;
          correctBg.setFillStyle(0x44aa44);
        }
      }
    }
    
    this.isActive = false;
    
    // Calculate reward
    const reward = this.calculateReward(correct, timeTaken, this.currentQuestion);
    
    // Close after 1.5 seconds
    this.scene.time.delayedCall(1500, () => {
      this.hide();
      if (this.onComplete) {
        this.onComplete({
          correct,
          timeTaken,
          question: this.currentQuestion!,
          reward,
        });
      }
    });
  }

  private calculateReward(correct: boolean, timeTaken: number, question: MathQuestion): MathReward {
    if (!correct) {
      return {
        xp: 0,
        hp: -1,
        message: 'Wrong answer! -1 HP',
      };
    }
    
    // Bonus for fast answers
    const timeBonus = timeTaken < question.timeLimit * 0.5 ? 2 : 1;
    const xp = question.difficulty * 10 * timeBonus;
    
    return {
      xp,
      hp: question.difficulty >= 3 ? 1 : 0,
      magic: question.difficulty >= 4 ? 1 : 0,
      message: timeTaken < question.timeLimit * 0.5
        ? `Fast! +${xp} XP (Speed Bonus!)`
        : `Correct! +${xp} XP`,
    };
  }

  public update(delta: number): void {
    if (!this.isActive || !this.currentQuestion) return;
    
    this.timeRemaining -= delta / 1000;
    
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.handleTimeout();
    }
    
    // Update timer bar
    const progress = this.timeRemaining / this.currentQuestion.timeLimit;
    const maxWidth = this.currentBoxWidth - 30;
    if (this.timerBar) {
      this.timerBar.setDisplaySize(maxWidth * progress, 16);
      
      // Color changes: green -> yellow -> red
      if (progress > 0.5) {
        this.timerBar.setFillStyle(0x44ff44);
      } else if (progress > 0.25) {
        this.timerBar.setFillStyle(0xffaa00);
      } else {
        this.timerBar.setFillStyle(0xff4444);
      }
    }
    
    if (this.timerText) {
      this.timerText.setText(Math.ceil(this.timeRemaining).toString());
    }
  }

  private handleTimeout(): void {
    this.isActive = false;
    
    if (this.resultText) {
      this.resultText.setText('⏰ Time\'s up! -2 HP').setColor('#ff8800');
    }
    
    this.scene.time.delayedCall(1500, () => {
      this.hide();
      if (this.onComplete && this.currentQuestion) {
        this.onComplete({
          correct: false,
          timeTaken: this.currentQuestion.timeLimit,
          question: this.currentQuestion,
          reward: {
            xp: 0,
            hp: -2,
            message: 'Time\'s up! -2 HP',
          },
        });
      }
    });
  }

  public hide(): void {
    if (this.container) this.container.setVisible(false);
    this.isActive = false;
    this.currentQuestion = null;
  }

  public isShowing(): boolean {
    return this.isActive;
  }
}
