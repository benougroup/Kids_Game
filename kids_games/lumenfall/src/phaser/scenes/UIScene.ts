import Phaser from 'phaser';

// ─── Colour palette ────────────────────────────────────────────────────────────
const C = {
  // Gold / bronze
  GOLD:       0xffd700,
  GOLD_DARK:  0xb8860b,
  GOLD_LIGHT: 0xffe066,
  BRONZE:     0xcd7f32,

  // Panel / HUD
  HUD_BG:     0x1a0e00,
  PANEL_BG:   0x1a0e00,
  PANEL_EDGE: 0x4a3000,

  // HP
  HP_BG:      0x3d0000,
  HP_FILL:    0xdd2222,
  HP_SHINE:   0xff6666,

  // SP
  SP_BG:      0x00003d,
  SP_FILL:    0x2266dd,
  SP_SHINE:   0x66aaff,

  // Buttons
  BTN_MAP_BG:  0x1a3300,
  BTN_ACT_BG:  0x3d0000,
  BTN_BAG_BG:  0x001a3d,
  BTN_BORDER:  0xffd700,
  BTN_CORNER:  0xb8860b,
  BTN_TEXT:    0xfff0a0,

  // Text
  WHITE:      0xffffff,
  CREAM:      0xfff0d0,
};

// ─── Helper: draw a pixel-art style bordered rectangle ─────────────────────────
function drawPixelPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  bgColor: number, borderColor: number, cornerColor: number,
  borderThick = 3
): void {
  // Fill
  g.fillStyle(bgColor, 0.92);
  g.fillRect(x + borderThick, y + borderThick, w - borderThick * 2, h - borderThick * 2);

  // Top & bottom border
  g.fillStyle(borderColor, 1);
  g.fillRect(x + borderThick, y, w - borderThick * 2, borderThick);
  g.fillRect(x + borderThick, y + h - borderThick, w - borderThick * 2, borderThick);

  // Left & right border
  g.fillRect(x, y + borderThick, borderThick, h - borderThick * 2);
  g.fillRect(x + w - borderThick, y + borderThick, borderThick, h - borderThick * 2);

  // Corner squares (darker)
  g.fillStyle(cornerColor, 1);
  g.fillRect(x, y, borderThick + 2, borderThick + 2);
  g.fillRect(x + w - borderThick - 2, y, borderThick + 2, borderThick + 2);
  g.fillRect(x, y + h - borderThick - 2, borderThick + 2, borderThick + 2);
  g.fillRect(x + w - borderThick - 2, y + h - borderThick - 2, borderThick + 2, borderThick + 2);

  // Inner highlight (top-left shine)
  g.fillStyle(0xffffff, 0.06);
  g.fillRect(x + borderThick, y + borderThick, w - borderThick * 2, 2);
  g.fillRect(x + borderThick, y + borderThick, 2, h - borderThick * 2);
}

// ─── Helper: draw a stat bar (HP / SP) ────────────────────────────────────────
function drawStatBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  bgColor: number, fillColor: number, shineColor: number,
  ratio: number   // 0–1
): void {
  const bord = 2;
  // Background
  g.fillStyle(bgColor, 1);
  g.fillRect(x + bord, y + bord, w - bord * 2, h - bord * 2);

  // Fill
  const fillW = Math.max(0, Math.round((w - bord * 2) * ratio));
  if (fillW > 0) {
    g.fillStyle(fillColor, 1);
    g.fillRect(x + bord, y + bord, fillW, h - bord * 2);

    // Shine strip
    g.fillStyle(shineColor, 0.4);
    g.fillRect(x + bord, y + bord, fillW, Math.max(2, Math.round((h - bord * 2) * 0.35)));
  }

  // Border
  g.fillStyle(C.GOLD_DARK, 1);
  g.fillRect(x, y, w, bord);
  g.fillRect(x, y + h - bord, w, bord);
  g.fillRect(x, y, bord, h);
  g.fillRect(x + w - bord, y, bord, h);
}

/**
 * UIScene — Fantasy RPG HUD
 * Runs parallel to GameScene (always on top)
 */
export class UIScene extends Phaser.Scene {
  // HUD graphics (redrawn on stat change)
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private spText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeBadge!: Phaser.GameObjects.Graphics;

  // Buttons
  private bagButton!: Phaser.GameObjects.Container;
  private actionButton!: Phaser.GameObjects.Container;
  private mapButton!: Phaser.GameObjects.Container;

  // Panels
  private inventoryPanel!: Phaser.GameObjects.Container;
  private inventoryVisible = false;
  private inventoryItemsText!: Phaser.GameObjects.Text;
  private inventoryItems: string[] = [];

  private mapPanel!: Phaser.GameObjects.Container;
  private mapVisible = false;

  // Stats
  private hp = 6;
  private maxHp = 6;
  private sp = 4;
  private maxSp = 4;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── HUD graphics layer (redrawn on stat change) ──────────────────────────
    this.hudGraphics = this.add.graphics();
    this.hudGraphics.setScrollFactor(0).setDepth(2000);
    this.drawHUD(W);

    // ── HP text ──────────────────────────────────────────────────────────────
    this.hpText = this.add.text(60, 8, `${this.hp}/${this.maxHp}`, {
      fontSize: '13px', color: '#fff0d0', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.hpText.setScrollFactor(0).setDepth(2005);

    // ── SP text ──────────────────────────────────────────────────────────────
    this.spText = this.add.text(60, 30, `${this.sp}/${this.maxSp}`, {
      fontSize: '13px', color: '#d0e8ff', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.spText.setScrollFactor(0).setDepth(2005);

    // ── Time badge ───────────────────────────────────────────────────────────
    this.timeBadge = this.add.graphics();
    this.timeBadge.setScrollFactor(0).setDepth(2005);

    // Time badge text — positioned inside the HUD bar (y=14 centres it in 52px HUD)
    this.timeText = this.add.text(W - 10, 14, 'DAY', {
      fontSize: '14px', color: '#fff0a0', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.timeText.setOrigin(1, 0).setScrollFactor(0).setDepth(2006);
    this.drawTimeBadge(W, 'DAY', 0xcc6600);

    // ── Buttons ──────────────────────────────────────────────────────────────
    this.createButtons(W, H);

    // ── Panels ───────────────────────────────────────────────────────────────
    this.createInventoryPanel(W, H);
    this.createMapPanel(W, H);

    // ── Event listeners ──────────────────────────────────────────────────────
    const game = this.scene.get('GameScene');
    game.events.on('timeUpdate',      (t: number)    => this.onTimeUpdate(t));
    game.events.on('hpUpdate',        (d: { hp: number; maxHp: number }) => this.updateHP(d.hp, d.maxHp));
    game.events.on('showDialogue',    (n: string)    => this.showDialogue(n));
    game.events.on('inventoryChanged',(items: string[]) => { this.inventoryItems = [...items]; this.refreshInventoryText(); });
    game.events.on('inventoryAddItem',(item: string) => { this.inventoryItems.push(item); this.refreshInventoryText(); });
    game.events.on('playerAction',    ()             => this.handleAction());

    this.scale.on('resize', (sz: Phaser.Structs.Size) => this.handleResize(sz.width, sz.height));
  }

  // ── Draw HUD panel + bars ──────────────────────────────────────────────────
  private drawHUD(W: number): void {
    const g = this.hudGraphics;
    g.clear();

    const HUD_H = 52;

    // Background panel
    drawPixelPanel(g, 0, 0, W, HUD_H, C.HUD_BG, C.GOLD_DARK, C.BRONZE, 3);

    // HP icon (heart ♥ drawn as pixel art)
    const hx = 14, hy = 6;
    g.fillStyle(C.HP_FILL, 1);
    // Heart shape: two bumps + triangle
    g.fillRect(hx + 2, hy,     4, 2);
    g.fillRect(hx + 7, hy,     4, 2);
    g.fillRect(hx,     hy + 2, 13, 4);
    g.fillRect(hx + 1, hy + 6, 11, 2);
    g.fillRect(hx + 2, hy + 8, 9,  2);
    g.fillRect(hx + 3, hy + 10, 7, 2);
    g.fillRect(hx + 4, hy + 12, 5, 2);
    g.fillRect(hx + 5, hy + 14, 3, 2);
    g.fillRect(hx + 6, hy + 16, 1, 2);
    // Shine
    g.fillStyle(C.HP_SHINE, 0.6);
    g.fillRect(hx + 3, hy + 1, 2, 2);

    // HP bar
    drawStatBar(g, 32, 6, W * 0.28, 18, C.HP_BG, C.HP_FILL, C.HP_SHINE, this.hp / this.maxHp);

    // SP icon (star ★ pixel art)
    const sx = 14, sy = 28;
    g.fillStyle(C.SP_FILL, 1);
    g.fillRect(sx + 5, sy,     3, 4);
    g.fillRect(sx + 3, sy + 4, 7, 3);
    g.fillRect(sx,     sy + 5, 13, 3);
    g.fillRect(sx + 2, sy + 8, 9,  3);
    g.fillRect(sx,     sy + 11, 4, 3);
    g.fillRect(sx + 9, sy + 11, 4, 3);
    g.fillRect(sx + 1, sy + 14, 3, 3);
    g.fillRect(sx + 9, sy + 14, 3, 3);
    // Shine
    g.fillStyle(C.SP_SHINE, 0.6);
    g.fillRect(sx + 5, sy + 1, 2, 2);

    // SP bar
    drawStatBar(g, 32, 28, W * 0.28, 18, C.SP_BG, C.SP_FILL, C.SP_SHINE, this.sp / this.maxSp);

    // Divider line
    g.fillStyle(C.GOLD_DARK, 0.5);
    g.fillRect(W * 0.32, 6, 2, HUD_H - 12);
  }

  private drawTimeBadge(W: number, _label: string, color: number): void {
    const g = this.timeBadge;
    g.clear();
    // Badge sits inside the 52px HUD bar, vertically centred
    const tw = 72, th = 24;
    const tx = W - tw - 6, ty = 14;  // y=14 centres a 24px badge in 52px HUD
    drawPixelPanel(g, tx, ty, tw, th, color, C.GOLD, C.GOLD_DARK, 3);
  }

  // ── Buttons ────────────────────────────────────────────────────────────────
  private createButtons(W: number, H: number): void {
    // Slightly smaller buttons (64px) to fit the 720×480 canvas
    const BTN = 64;
    const y = H - BTN / 2 - 8;

    // BAG
    this.bagButton = this.makeButton(W - BTN / 2 - 8, y, BTN, 'BAG', '🎒', C.BTN_BAG_BG, 0x4488cc);
    this.bagButton.setInteractive(new Phaser.Geom.Rectangle(-BTN/2, -BTN/2, BTN, BTN), Phaser.Geom.Rectangle.Contains);
    this.bagButton.on('pointerdown', () => this.toggleInventory());

    // ACT
    this.actionButton = this.makeButton(W - BTN * 1.5 - 14, y, BTN, 'ACT', '⚔️', C.BTN_ACT_BG, 0xcc3333);
    this.actionButton.setInteractive(new Phaser.Geom.Rectangle(-BTN/2, -BTN/2, BTN, BTN), Phaser.Geom.Rectangle.Contains);
    this.actionButton.on('pointerdown', () => this.handleAction());

    // MAP
    this.mapButton = this.makeButton(W - BTN * 2.5 - 20, y, BTN, 'MAP', '🗺️', C.BTN_MAP_BG, 0x336633);
    this.mapButton.setInteractive(new Phaser.Geom.Rectangle(-BTN/2, -BTN/2, BTN, BTN), Phaser.Geom.Rectangle.Contains);
    this.mapButton.on('pointerdown', () => this.toggleMap());
  }

  private makeButton(
    cx: number, cy: number, size: number,
    label: string, _icon: string,
    bgColor: number, accentColor: number
  ): Phaser.GameObjects.Container {
    const c = this.add.container(cx, cy);
    c.setScrollFactor(0).setDepth(2010);

    const g = this.add.graphics();
    const half = size / 2;

    // Shadow
    g.fillStyle(0x000000, 0.4);
    g.fillRect(-half + 3, -half + 3, size, size);

    // Main panel
    drawPixelPanel(g, -half, -half, size, size, bgColor, C.GOLD, C.GOLD_DARK, 4);

    // Accent strip at top
    g.fillStyle(accentColor, 0.5);
    g.fillRect(-half + 4, -half + 4, size - 8, 6);

    // Label text
    const txt = this.add.text(0, half * 0.35, label, {
      fontSize: '13px',
      color: '#fff0a0',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    txt.setOrigin(0.5, 0.5);

    // Icon text (emoji rendered as text)
    const icon = this.add.text(0, -half * 0.2, _icon, {
      fontSize: '22px',
    });
    icon.setOrigin(0.5, 0.5);

    c.add([g, icon, txt]);
    c.setSize(size, size);

    // Hover effect
    c.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x000000, 0.4);
      g.fillRect(-half + 3, -half + 3, size, size);
      drawPixelPanel(g, -half, -half, size, size, bgColor, C.GOLD_LIGHT, C.GOLD, 4);
      g.fillStyle(accentColor, 0.7);
      g.fillRect(-half + 4, -half + 4, size - 8, 6);
    });
    c.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x000000, 0.4);
      g.fillRect(-half + 3, -half + 3, size, size);
      drawPixelPanel(g, -half, -half, size, size, bgColor, C.GOLD, C.GOLD_DARK, 4);
      g.fillStyle(accentColor, 0.5);
      g.fillRect(-half + 4, -half + 4, size - 8, 6);
    });

    return c;
  }

  // ── Inventory panel ────────────────────────────────────────────────────────
  private createInventoryPanel(W: number, H: number): void {
    this.inventoryPanel = this.add.container(0, 0);
    this.inventoryPanel.setScrollFactor(0).setDepth(3000).setVisible(false);

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.75);
    overlay.setOrigin(0, 0).setInteractive();
    overlay.on('pointerdown', () => this.toggleInventory());

    const bw = Math.min(480, W - 40), bh = Math.min(380, H - 100);
    const bx = W / 2, by = H / 2;

    const panelG = this.add.graphics();
    drawPixelPanel(panelG, bx - bw / 2, by - bh / 2, bw, bh, C.PANEL_BG, C.GOLD, C.GOLD_DARK, 5);

    const title = this.add.text(bx, by - bh / 2 + 24, '⚔  Inventory  ⚔', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Divider
    const divG = this.add.graphics();
    divG.fillStyle(C.GOLD_DARK, 0.8);
    divG.fillRect(bx - bw / 2 + 20, by - bh / 2 + 44, bw - 40, 2);

    this.inventoryItemsText = this.add.text(bx, by - 10, 'No items yet', {
      fontSize: '15px', color: '#fff0d0', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: bw - 60 },
    });
    this.inventoryItemsText.setOrigin(0.5, 0.5);

    // Close button
    const closeBtnG = this.add.graphics();
    const cbx = bx, cby = by + bh / 2 - 30;
    drawPixelPanel(closeBtnG, cbx - 60, cby - 16, 120, 32, 0x3d0000, C.GOLD, C.GOLD_DARK, 3);
    const closeText = this.add.text(cbx, cby, 'Close', {
      fontSize: '15px', color: '#fff0a0', fontFamily: 'monospace', fontStyle: 'bold',
    });
    closeText.setOrigin(0.5, 0.5).setInteractive();
    closeText.on('pointerdown', () => this.toggleInventory());

    this.inventoryPanel.add([overlay, panelG, title, divG, this.inventoryItemsText, closeBtnG, closeText]);
  }

  // ── Map panel ──────────────────────────────────────────────────────────────
  private createMapPanel(W: number, H: number): void {
    this.mapPanel = this.add.container(0, 0);
    this.mapPanel.setScrollFactor(0).setDepth(3000).setVisible(false);

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.8);
    overlay.setOrigin(0, 0).setInteractive();
    overlay.on('pointerdown', () => this.toggleMap());

    const bw = Math.min(540, W - 40), bh = Math.min(440, H - 80);
    const bx = W / 2, by = H / 2;

    const panelG = this.add.graphics();
    drawPixelPanel(panelG, bx - bw / 2, by - bh / 2, bw, bh, C.PANEL_BG, C.GOLD, C.GOLD_DARK, 5);

    const title = this.add.text(bx, by - bh / 2 + 24, '🗺  World Map  🗺', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Map drawing
    const mapG = this.add.graphics();
    const ml = bx - bw / 2 + 20, mt = by - bh / 2 + 52;
    const mw = bw - 40, mh = bh - 110;

    // Map background (parchment)
    mapG.fillStyle(0x2d5a27, 1);
    mapG.fillRect(ml, mt, mw, mh);
    mapG.fillStyle(0x1a3d1a, 0.5);
    mapG.fillRect(ml, mt, mw, 4);

    // Roads
    const cx2 = ml + mw * 0.5, cy2 = mt + mh * 0.5;
    mapG.fillStyle(0xc8a96e, 0.7);
    mapG.fillRect(cx2 - 3, mt, 6, mh);
    mapG.fillRect(ml, cy2 - 3, mw, 6);

    // Town (centre)
    mapG.fillStyle(0x8b7355, 1);
    mapG.fillRect(cx2 - 25, cy2 - 15, 50, 30);
    mapG.fillStyle(C.GOLD, 1);
    mapG.strokeRect(cx2 - 25, cy2 - 15, 50, 30);

    // Forest (north)
    mapG.fillStyle(0x1a5c1a, 1);
    mapG.fillRect(cx2 - 20, mt + mh * 0.12, 40, 24);
    mapG.fillStyle(0x44aa44, 1);
    mapG.strokeRect(cx2 - 20, mt + mh * 0.12, 40, 24);

    // Dungeon (south)
    mapG.fillStyle(0x3a1a1a, 1);
    mapG.fillRect(cx2 - 20, mt + mh * 0.82, 40, 24);
    mapG.fillStyle(0xaa4444, 1);
    mapG.strokeRect(cx2 - 20, mt + mh * 0.82, 40, 24);

    // Player dot
    mapG.fillStyle(0xffff00, 1);
    mapG.fillCircle(cx2 + 4, cy2 - 4, 5);

    const townLbl = this.add.text(cx2, cy2, 'Village', { fontSize: '9px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold', align: 'center' });
    townLbl.setOrigin(0.5);
    const forestLbl = this.add.text(cx2, mt + mh * 0.12 + 12, 'Forest', { fontSize: '9px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' });
    forestLbl.setOrigin(0.5);
    const dungeonLbl = this.add.text(cx2, mt + mh * 0.82 + 12, 'Dungeon', { fontSize: '9px', color: '#ffaaaa', fontFamily: 'monospace', align: 'center' });
    dungeonLbl.setOrigin(0.5);
    const youLbl = this.add.text(cx2 + 12, cy2 - 4, '← You', { fontSize: '9px', color: '#ffff00', fontFamily: 'monospace', fontStyle: 'bold' });
    youLbl.setOrigin(0, 0.5);

    // Close button
    const closeBtnG = this.add.graphics();
    const cbx = bx, cby = by + bh / 2 - 28;
    drawPixelPanel(closeBtnG, cbx - 70, cby - 16, 140, 32, 0x1a3300, C.GOLD, C.GOLD_DARK, 3);
    const closeText = this.add.text(cbx, cby, 'Close Map', {
      fontSize: '14px', color: '#fff0a0', fontFamily: 'monospace', fontStyle: 'bold',
    });
    closeText.setOrigin(0.5, 0.5).setInteractive();
    closeText.on('pointerdown', () => this.toggleMap());

    this.mapPanel.add([overlay, panelG, title, mapG, townLbl, forestLbl, dungeonLbl, youLbl, closeBtnG, closeText]);
  }

  // ── Time update ────────────────────────────────────────────────────────────
  private onTimeUpdate(t: number): void {
    let label: string;
    let color: number;
    let textColor: string;
    if (t < 0.25)      { label = 'DAWN';  color = 0x994400; textColor = '#ffcc88'; }
    else if (t < 0.5)  { label = 'DAY';   color = 0xcc6600; textColor = '#fff0a0'; }
    else if (t < 0.75) { label = 'DUSK';  color = 0x882200; textColor = '#ff9966'; }
    else               { label = 'NIGHT'; color = 0x111144; textColor = '#aaaaff'; }

    this.timeText.setText(label).setColor(textColor);
    this.drawTimeBadge(this.scale.width, label, color);
  }

  // ── Stat updates ───────────────────────────────────────────────────────────
  public updateHP(hp: number, maxHp: number): void {
    this.hp = hp; this.maxHp = maxHp;
    this.hpText.setText(`${hp}/${maxHp}`);
    this.drawHUD(this.scale.width);
  }

  public updateSP(sp: number, maxSp: number): void {
    this.sp = sp; this.maxSp = maxSp;
    this.spText.setText(`${sp}/${maxSp}`);
    this.drawHUD(this.scale.width);
  }

  // ── Panel toggles ──────────────────────────────────────────────────────────
  private toggleInventory(): void {
    this.inventoryVisible = !this.inventoryVisible;
    this.inventoryPanel.setVisible(this.inventoryVisible);
    if (this.inventoryVisible && this.mapVisible) { this.mapVisible = false; this.mapPanel.setVisible(false); }
  }

  private toggleMap(): void {
    this.mapVisible = !this.mapVisible;
    this.mapPanel.setVisible(this.mapVisible);
    if (this.mapVisible && this.inventoryVisible) { this.inventoryVisible = false; this.inventoryPanel.setVisible(false); }
  }

  private handleAction(): void {
    const game = this.scene.get('GameScene');
    game.events.emit('playerAction');
  }

  private showDialogue(npcName: string): void {
    console.log('Show dialogue for:', npcName);
    alert(`Talking to ${npcName}\n\n(Dialogue system coming next!)`);
  }

  private refreshInventoryText(): void {
    if (!this.inventoryItemsText) return;
    this.inventoryItemsText.setText(
      this.inventoryItems.length === 0
        ? 'No items yet'
        : this.inventoryItems.map((item, i) => `${i + 1}. ${item}`).join('\n')
    );
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  private handleResize(W: number, H: number): void {
    const BTN = 64;
    const y = H - BTN / 2 - 8;
    this.bagButton?.setPosition(W - BTN / 2 - 8, y);
    this.actionButton?.setPosition(W - BTN * 1.5 - 14, y);
    this.mapButton?.setPosition(W - BTN * 2.5 - 20, y);
    this.timeText?.setPosition(W - 10, 14);
    this.drawHUD(W);
    this.drawTimeBadge(W, this.timeText?.text ?? 'DAY', 0xcc6600);
  }
}
