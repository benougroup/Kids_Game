/**
 * ModernRenderer - Clean vector-style rendering without pixel art
 * 
 * Renders game elements using Canvas2D primitives (circles, rectangles, gradients)
 * for a smooth, modern aesthetic that scales perfectly on any device.
 */

export class ModernRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  /**
   * Draw a grass tile with simple gradient
   */
  drawGrassTile(x: number, y: number, size: number): void {
    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, '#5cb85c');
    gradient.addColorStop(1, '#4a9d4a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);
    
    // Add small flower dots
    if (Math.random() > 0.7) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.arc(x + size * 0.3, y + size * 0.4, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draw a dirt path tile
   */
  drawDirtTile(x: number, y: number, size: number): void {
    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, '#8b6f47');
    gradient.addColorStop(1, '#6b5437');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);
  }

  /**
   * Draw a stone floor tile
   */
  drawStoneTile(x: number, y: number, size: number): void {
    this.ctx.fillStyle = '#7a7a7a';
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = '#5a5a5a';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }

  /**
   * Draw a water tile with ripple effect
   */
  drawWaterTile(x: number, y: number, size: number): void {
    const gradient = this.ctx.createRadialGradient(
      x + size / 2, y + size / 2, 0,
      x + size / 2, y + size / 2, size / 2
    );
    gradient.addColorStop(0, '#4a90e2');
    gradient.addColorStop(1, '#2e5f8f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);
  }

  /**
   * Draw a simple character (player or NPC)
   */
  drawCharacter(x: number, y: number, size: number, config: {
    skinColor?: string;
    clothingColor?: string;
    hairColor?: string;
    hasHelmet?: boolean;
    hasHat?: boolean;
  }): void {
    const {
      skinColor = '#ffdbac',
      clothingColor = '#4a90e2',
      hairColor = '#8b4513',
      hasHelmet = false,
      hasHat = false,
    } = config;

    const headRadius = size * 0.3;
    const bodyWidth = size * 0.6;
    const bodyHeight = size * 0.8;

    // Head
    this.ctx.fillStyle = skinColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y - size * 0.3, headRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Hair/Helmet/Hat
    if (hasHelmet) {
      this.ctx.fillStyle = '#c0c0c0'; // Silver helmet
      this.ctx.beginPath();
      this.ctx.arc(x, y - size * 0.3, headRadius * 1.1, Math.PI, 0);
      this.ctx.fill();
    } else if (hasHat) {
      this.ctx.fillStyle = '#8b008b'; // Purple wizard hat
      this.ctx.beginPath();
      this.ctx.moveTo(x - headRadius, y - size * 0.3);
      this.ctx.lineTo(x, y - size * 0.7);
      this.ctx.lineTo(x + headRadius, y - size * 0.3);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = hairColor;
      this.ctx.beginPath();
      this.ctx.arc(x, y - size * 0.3, headRadius * 0.9, Math.PI, 0);
      this.ctx.fill();
    }

    // Body
    this.ctx.fillStyle = clothingColor;
    this.ctx.fillRect(x - bodyWidth / 2, y, bodyWidth, bodyHeight);

    // Simple arms
    this.ctx.fillRect(x - bodyWidth / 2 - 8, y + 10, 8, bodyHeight * 0.5);
    this.ctx.fillRect(x + bodyWidth / 2, y + 10, 8, bodyHeight * 0.5);
  }

  /**
   * Draw a simple house/building
   */
  drawHouse(x: number, y: number, width: number, height: number): void {
    // Walls
    this.ctx.fillStyle = '#d2691e'; // Brown
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // Roof
    this.ctx.fillStyle = '#dc143c'; // Red
    this.ctx.beginPath();
    this.ctx.moveTo(x - 10, y);
    this.ctx.lineTo(x + width / 2, y - height * 0.4);
    this.ctx.lineTo(x + width + 10, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Door
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(x + width * 0.4, y + height * 0.5, width * 0.2, height * 0.5);

    // Window
    this.ctx.fillStyle = '#87ceeb'; // Sky blue
    this.ctx.fillRect(x + width * 0.1, y + height * 0.2, width * 0.2, height * 0.2);
  }

  /**
   * Draw a light post with glowing lantern
   */
  drawLightPost(x: number, y: number, size: number, isGlowing: boolean = true): void {
    // Pole
    this.ctx.fillStyle = '#4a4a4a';
    this.ctx.fillRect(x - 3, y, 6, size);

    // Lantern
    const lanternY = y - 15;
    const lanternRadius = 10;

    if (isGlowing) {
      // Glow effect
      const gradient = this.ctx.createRadialGradient(x, lanternY, 0, x, lanternY, lanternRadius * 3);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, lanternY, lanternRadius * 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Lantern body
    this.ctx.fillStyle = isGlowing ? '#ffd700' : '#666';
    this.ctx.beginPath();
    this.ctx.arc(x, lanternY, lanternRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draw a simple tree
   */
  drawTree(x: number, y: number, size: number): void {
    // Trunk
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(x - size * 0.1, y + size * 0.3, size * 0.2, size * 0.5);

    // Foliage (simple circle)
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    gradient.addColorStop(0, '#228b22');
    gradient.addColorStop(1, '#1a6b1a');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a shadow creature (simple dark shape)
   */
  drawShadow(x: number, y: number, size: number, isStory: boolean = false): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(20, 0, 30, 0.9)');
    gradient.addColorStop(1, 'rgba(20, 0, 30, 0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes (red glow)
    if (!isStory) {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(x - size * 0.3, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
      this.ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draw a glowing collectible (ingredient or glow)
   */
  drawGlowingItem(x: number, y: number, size: number, color: string = '#ffd700'): void {
    // Outer glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Core
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Sparkle effect
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 1.5, y);
    this.ctx.lineTo(x + size * 1.5, y);
    this.ctx.moveTo(x, y - size * 1.5);
    this.ctx.lineTo(x, y + size * 1.5);
    this.ctx.stroke();
  }

  /**
   * Get tile color based on sprite ID (for fallback rendering)
   */
  getTileColor(spriteId: string | null): string {
    if (!spriteId) return '#404040';
    if (spriteId.includes('grass')) return '#5cb85c';
    if (spriteId.includes('dirt')) return '#8b6f47';
    if (spriteId.includes('stone')) return '#7a7a7a';
    if (spriteId.includes('water')) return '#4a90e2';
    if (spriteId.includes('wood')) return '#d2691e';
    if (spriteId.includes('sand')) return '#f4a460';
    return '#404040';
  }
}
