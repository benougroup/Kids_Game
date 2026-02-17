export type SpriteRect = { x: number; y: number; w: number; h: number };

type AtlasJSON = {
  meta?: { image?: string; size?: { w: number; h: number } };
  sprites?: Record<string, SpriteRect>;
};

const PLACEHOLDER_COLORS: Record<string, string> = {
  tile_grass: '#3a8f3a',
  tile_dirt: '#8b5a2b',
  tile_stone: '#808080',
  tile_floor: '#c2b280',
  player_idle_0: '#6ed7ff',
  player_idle_1: '#4fb4f0',
  npc_guard_idle_0: '#dcc85a',
  npc_apprentice_idle_0: '#b478dc',
  shadow_0: 'rgba(20,20,30,0.72)',
};

export class AssetManager {
  private atlasImage: HTMLImageElement | null = null;
  private spriteRects: Record<string, SpriteRect> = {};

  async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      image.src = url;
    });
  }

  async loadJSON(url: string): Promise<unknown> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
    return res.json();
  }

  async loadAtlas(imageUrl: string, jsonUrl: string): Promise<void> {
    const atlasJson = await this.loadJSON(jsonUrl);
    const rects = this.parseAtlas(atlasJson);
    try {
      this.atlasImage = await this.loadImage(imageUrl);
    } catch {
      this.atlasImage = this.buildPlaceholderAtlas(atlasJson as AtlasJSON, rects);
    }
  }

  parseAtlas(json: unknown): Record<string, SpriteRect> {
    const data = json as AtlasJSON;
    const sprites = data.sprites ?? {};
    const parsed: Record<string, SpriteRect> = {};
    for (const [id, rect] of Object.entries(sprites)) {
      parsed[id] = { x: rect.x | 0, y: rect.y | 0, w: rect.w | 0, h: rect.h | 0 };
    }
    this.spriteRects = parsed;
    return parsed;
  }


  private buildPlaceholderAtlas(atlas: AtlasJSON, rects: Record<string, SpriteRect>): HTMLImageElement {
    const width = atlas.meta?.size?.w ?? 256;
    const height = atlas.meta?.size?.h ?? 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create placeholder atlas canvas context.');
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    for (const [spriteId, rect] of Object.entries(rects)) {
      ctx.fillStyle = PLACEHOLDER_COLORS[spriteId] ?? '#ff00ff';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      if (spriteId.startsWith('shadow_')) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(rect.x + 2, rect.y + 2, Math.max(1, rect.w - 4), Math.max(1, rect.h - 4));
    }
    const image = new Image();
    image.src = canvas.toDataURL('image/png');
    return image;
  }

  getSpriteRect(spriteId: string): SpriteRect | null {
    return this.spriteRects[spriteId] ?? null;
  }

  getImage(): HTMLImageElement | null {
    return this.atlasImage;
  }
}
