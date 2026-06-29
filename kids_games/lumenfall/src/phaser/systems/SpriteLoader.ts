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
  // ── Large props ────────────────────────────────────────────────────────────
  { category: 'props_large', name: 'tree_oak_large' },
  { category: 'props_large', name: 'tree_pine_tall' },
  { category: 'props_large', name: 'tree_dead' },
  { category: 'props_large', name: 'tree_ruins_combo' },
  { category: 'props_large', name: 'statue_knight' },
  { category: 'props_large', name: 'statue_robed' },
  { category: 'props_large', name: 'statue_angel_01' },
  { category: 'props_large', name: 'statue_angel_02' },
  { category: 'props_large', name: 'ruin_arch_stone' },
  { category: 'props_large', name: 'tower_ruins' },
  { category: 'props_large', name: 'column_ruins' },
  { category: 'props_large', name: 'fountain_round' },
  { category: 'props_large', name: 'sarcophagus' },
  { category: 'props_large', name: 'bridge_stone_arch' },
  { category: 'props_large', name: 'bridge_stone_railing' },
  { category: 'props_large', name: 'tent_circus' },
  { category: 'props_large', name: 'tent_plain_01' },
  { category: 'props_large', name: 'tent_plain_02' },
  { category: 'props_large', name: 'tent_plain_03' },
  { category: 'props_large', name: 'tent_plain_04' },
  // ── Medium props ───────────────────────────────────────────────────────────
  { category: 'props_medium', name: 'barrel_pair' },
  { category: 'props_medium', name: 'barrel_triple' },
  { category: 'props_medium', name: 'log_pile' },
  { category: 'props_medium', name: 'rock_large' },
  { category: 'props_medium', name: 'hay_bale' },
  { category: 'props_medium', name: 'campfire' },
  { category: 'props_medium', name: 'campfire_large' },
  { category: 'props_medium', name: 'bush_small' },
  { category: 'props_medium', name: 'lamp_post' },
  { category: 'props_medium', name: 'lamp_post_2' },
  { category: 'props_medium', name: 'fence_long' },
  { category: 'props_medium', name: 'pillory' },
  { category: 'props_medium', name: 'well_large' },
  { category: 'props_medium', name: 'skull_pile' },
  { category: 'props_medium', name: 'chest_closed' },
  { category: 'props_medium', name: 'chest_open' },
  { category: 'props_medium', name: 'chest_medium' },
  { category: 'props_medium', name: 'chest_treasure' },
  { category: 'props_medium', name: 'cauldron_small' },
  { category: 'props_medium', name: 'cauldron_magic' },
  { category: 'props_medium', name: 'cooking_pot' },
  { category: 'props_medium', name: 'bucket_pair' },
  { category: 'props_medium', name: 'bucket_magic' },
  { category: 'props_medium', name: 'table_small' },
  { category: 'props_medium', name: 'table_large' },
  { category: 'props_medium', name: 'table_market' },
  { category: 'props_medium', name: 'market_stall_food' },
  { category: 'props_medium', name: 'market_stall_goods' },
  { category: 'props_medium', name: 'market_stall_large' },
  { category: 'props_medium', name: 'market_stall_covered' },
  { category: 'props_medium', name: 'crate_pile' },
  // ── Small props ────────────────────────────────────────────────────────────
  { category: 'props_small', name: 'barrel_single' },
  { category: 'props_small', name: 'crate_small' },
  { category: 'props_small', name: 'sack_single' },
  { category: 'props_small', name: 'sack_pair' },
  { category: 'props_small', name: 'sack_pile' },
  { category: 'props_small', name: 'fence_short' },
  { category: 'props_small', name: 'well_small' },
  { category: 'props_small', name: 'cart_empty' },
  { category: 'props_small', name: 'sign_village' },
  { category: 'props_small', name: 'sign_forest' },
  { category: 'props_small', name: 'sign_market' },
  { category: 'props_small', name: 'sign_double' },
  { category: 'props_small', name: 'gravestone_plain' },
  { category: 'props_small', name: 'gravestone_cross' },
  { category: 'props_small', name: 'gravestone_rounded' },
  { category: 'props_small', name: 'mushroom_pile' },
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
