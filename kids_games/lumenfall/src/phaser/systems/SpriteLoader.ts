/**
 * SpriteLoader — loads individually-cut sprite files from sprites/{category}/
 *
 * Each sprite is loaded as a standalone Phaser image with a key of the form:
 *   "sprite:{category}/{name}"
 * e.g. "sprite:buildings/tavern_blue_roof"
 *      "sprite:props_large/tree_oak_large"
 *
 * The MapBuilder checks for a "sprite:" key first; if found it uses the
 * individual file (correct crop, correct canvas size). If not found it falls
 * back to the legacy atlas frame.
 */

export interface SpriteEntry {
  key: string;   // Phaser texture key, e.g. "sprite:buildings/tavern_blue_roof"
  path: string;  // Asset path, e.g. "assets/sprites/buildings/tavern_blue_roof.png"
  category: string;
  name: string;
}

// ─── Canonical sprite registry ───────────────────────────────────────────────
// Every individually-cut sprite is listed here.
// Category → canonical canvas size (matches Lumenfall_Asset_Pipeline_Spec.md)
//   buildings   : 256×256  (large: 384×384)
//   props_large : 128×192
//   props_medium: 64×64
//   props_small : 32×48

const SPRITE_REGISTRY: Array<{ category: string; name: string }> = [
  // ── Buildings ──────────────────────────────────────────────────────────────
  { category: 'buildings', name: 'house_thatch_small' },
  { category: 'buildings', name: 'house_thatch_large' },
  { category: 'buildings', name: 'house_stone_red_roof' },
  { category: 'buildings', name: 'house_blue_roof_large' },
  { category: 'buildings', name: 'house_snow' },
  { category: 'buildings', name: 'tavern_blue_roof' },
  { category: 'buildings', name: 'tavern_red_balcony' },
  { category: 'buildings', name: 'alchemy_shop' },
  { category: 'buildings', name: 'magic_shop_crystal' },
  { category: 'buildings', name: 'market_food_building' },
  { category: 'buildings', name: 'blacksmith_forge_large' },
  { category: 'buildings', name: 'watchtower_small' },
  { category: 'buildings', name: 'chapel_large' },
  { category: 'buildings', name: 'castle_gate_medium' },
  { category: 'buildings', name: 'castle_fortress_large' },
  { category: 'buildings', name: 'ruin_castle_small' },
  { category: 'buildings', name: 'dockside_building' },
  { category: 'buildings', name: 'windmill_large' },
  { category: 'buildings', name: 'cottage_small' },
  { category: 'buildings', name: 'inn_large' },
  { category: 'buildings', name: 'castle_entrance' },
  { category: 'buildings', name: 'house_large' },
  { category: 'buildings', name: 'market_square' },
  { category: 'buildings', name: 'church_stone' },
  { category: 'buildings', name: 'fortress_small' },
  { category: 'buildings', name: 'dockside_large' },
  { category: 'buildings', name: 'windmill_small' },
  // ── Props (large / medium / small) ─────────────────────────────────────────
  // NOTE: Props are NOT listed here yet. The original sprite sheets pack objects
  // too tightly for clean alpha-based cropping — adjacent frames bleed into each
  // other. Props will be added here once new clean artwork is generated per the
  // Lumenfall_Asset_Pipeline_Spec.md. Until then the game falls back to the
  // legacy atlas frames for all props.
];

// ─── Canonical canvas sizes per category ─────────────────────────────────────
export const SPRITE_CANVAS_SIZES: Record<string, { w: number; h: number }> = {
  buildings:    { w: 256, h: 256 },
  props_large:  { w: 128, h: 192 },
  props_medium: { w: 64,  h: 64  },
  props_small:  { w: 32,  h: 48  },
};

// ─── Build the full entry list ────────────────────────────────────────────────
export function getAllSpriteEntries(): SpriteEntry[] {
  return SPRITE_REGISTRY.map(({ category, name }) => ({
    key: `sprite:${category}/${name}`,
    path: `assets/sprites/${category}/${name}.png`,
    category,
    name,
  }));
}

/**
 * Returns the Phaser texture key for a named sprite, or null if it isn't in the registry.
 * Use this in MapBuilder to prefer individual sprites over atlas frames.
 */
export function getSpriteKey(name: string): string | null {
  const entry = SPRITE_REGISTRY.find((e) => e.name === name);
  if (!entry) return null;
  return `sprite:${entry.category}/${name}`;
}

/**
 * Returns the canonical display size for a named sprite based on its category.
 */
export function getSpriteCategorySize(name: string): { w: number; h: number } | null {
  const entry = SPRITE_REGISTRY.find((e) => e.name === name);
  if (!entry) return null;
  return SPRITE_CANVAS_SIZES[entry.category] ?? null;
}
