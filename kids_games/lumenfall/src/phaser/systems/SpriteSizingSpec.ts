/**
 * MASTER SPRITE SIZING SPECIFICATION
 *
 * This is the authoritative reference for display size (pixels) of every sprite in Lumenfall.
 * Used by EntityRegistry, MapBuilder, and rendering systems.
 *
 * Format: displaySize (in pixels when rendered on screen)
 * Reference: Player character = 48px
 */

// ============================================================================
// CATEGORY: PLAYER & NPCS
// ============================================================================

export const PLAYER_DISPLAY_SIZE = 48;  // Base reference size

export const NPC_DISPLAY_SIZES: Record<string, number> = {
  // All NPCs: standard humanoid height (same as player)
  guard: 48,
  guard2: 48,
  apprentice: 48,
  merchant: 48,
  elder: 48,
  scholar: 48,
  child: 36,           // Child is smaller
  blacksmith: 48,
  innkeeper: 48,
  ranger: 48,
  hermit: 48,
  sick_villager: 44,   // Weakened/ill
  sleeping_elder: 48,
};

// ============================================================================
// CATEGORY: SMALL PEACEFUL ANIMALS (~20-28px)
// ============================================================================

export const SMALL_ANIMAL_DISPLAY_SIZES: Record<string, number> = {
  rabbit: 24,          // Hopping rabbit
  squirrel: 22,        // Scurrying squirrel
  frog: 20,            // Small frog
  butterfly: 20,       // Flying butterfly (tiny)
  bird: 24,            // Flying bird (robin-like)
  hedgehog: 22,        // Curled hedgehog
};

// ============================================================================
// CATEGORY: MEDIUM CREATURES (~28-44px)
// ============================================================================

export const MEDIUM_CREATURE_DISPLAY_SIZES: Record<string, number> = {
  // Slimes (various colors)
  slime: 32,
  slime_green: 28,
  slime_blue: 28,
  slime_red: 32,
  slime_king: 48,      // Boss - larger

  // Arachnids
  spider: 36,
  giant_bug: 38,

  // Undead
  skeleton: 44,
  zombie: 42,

  // Aquatic
  giant_snake: 42,
};

// ============================================================================
// CATEGORY: LARGE CREATURES (~48-60px)
// ============================================================================

export const LARGE_CREATURE_DISPLAY_SIZES: Record<string, number> = {
  // Aggressive animals
  wolf: 42,
  boar: 36,
  bear: 48,
  snake: 40,           // Snake (can be large)

  // Humanoid monsters
  troll: 52,
  demon: 50,
  skeleton: 44,        // Listed here as it's medium-large

  // Golems/Constructs
  golem: 58,           // Stone golem - very large

  // Bosses
  shadow_boss: 56,     // Shadow Lord
  slime_king: 48,      // King Slime boss
};

// ============================================================================
// CATEGORY: SHADOW/ETHEREAL (~32-56px)
// ============================================================================

export const ETHEREAL_CREATURE_DISPLAY_SIZES: Record<string, number> = {
  // Shadows & Wraiths
  shadow_small: 32,    // Shadow Wisp (small)
  shadow_stalker: 40,  // Shadow Stalker (medium)
  shadow_wraith: 32,   // Shadow Wraith (wisp-like)
  shadow_boss: 56,     // Shadow Lord (large)

  // Undead (ethereal)
  ghost: 40,           // Restless Ghost
  void_creature: 40,   // Void Creature

  // Dark entities
  dark_knight: 56,     // Dark Knight boss
};

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Get display size for any creature/NPC by ID
 * Falls back to sensible default if not found
 */
export function getDisplaySize(entityId: string): number {
  // Check all categories
  if (NPC_DISPLAY_SIZES[entityId] !== undefined) return NPC_DISPLAY_SIZES[entityId];
  if (SMALL_ANIMAL_DISPLAY_SIZES[entityId] !== undefined) return SMALL_ANIMAL_DISPLAY_SIZES[entityId];
  if (MEDIUM_CREATURE_DISPLAY_SIZES[entityId] !== undefined) return MEDIUM_CREATURE_DISPLAY_SIZES[entityId];
  if (LARGE_CREATURE_DISPLAY_SIZES[entityId] !== undefined) return LARGE_CREATURE_DISPLAY_SIZES[entityId];
  if (ETHEREAL_CREATURE_DISPLAY_SIZES[entityId] !== undefined) return ETHEREAL_CREATURE_DISPLAY_SIZES[entityId];

  // Default fallback
  console.warn(`No display size found for entity: ${entityId}, using default 48px`);
  return 48;
}

/**
 * Get display size for any entity (prop, building, creature, etc.)
 * Complete reference for all sprite types
 */
export function getUniversalDisplaySize(spriteId: string, spriteType: 'npc' | 'creature' | 'prop' | 'building'): number {
  // Buildings (by category)
  const BUILDING_SIZES: Record<string, number> = {
    // Standard buildings (256×256 canvas)
    house_thatch_small: 256,
    house_thatch_large: 256,
    house_stone_red_roof: 256,
    house_blue_roof_large: 256,
    house_snow: 256,
    house_large: 256,
    tavern_blue_roof: 256,
    tavern_red_balcony: 256,
    alchemy_shop: 256,
    magic_shop_crystal: 256,
    market_food_building: 256,
    blacksmith_forge_large: 256,
    watchtower_small: 256,
    chapel_large: 256,
    castle_gate_medium: 256,
    ruin_castle_small: 256,
    dockside_building: 256,
    windmill_large: 256,
    cottage_small: 256,
    inn_large: 256,
    church_stone: 256,
    windmill_small: 256,
    // Large buildings (384×384 canvas)
    castle_fortress_large: 384,
    castle_entrance: 384,
    market_square: 384,
    fortress_small: 384,
    dockside_large: 256,
  };

  // Props (by category)
  const PROP_SIZES: Record<string, number> = {
    // Large props (128×192 canvas)
    tree_oak_large: 128,
    tree_pine_tall: 128,
    tree_dead: 128,
    tree_ruins_combo: 128,
    statue_knight: 128,
    statue_robed: 128,
    statue_angel_01: 128,
    statue_angel_02: 128,
    ruin_arch_stone: 128,
    tower_ruins: 128,
    column_ruins: 128,
    fountain_round: 128,
    sarcophagus: 128,
    bridge_stone_arch: 128,
    bridge_stone_railing: 128,
    tent_circus: 128,
    tent_plain_01: 128,
    tent_plain_02: 128,
    tent_plain_03: 128,
    tent_plain_04: 128,
    // Medium props (64×64 canvas)
    barrel_pair: 64,
    barrel_triple: 64,
    log_pile: 64,
    rock_large: 64,
    hay_bale: 64,
    campfire: 64,
    campfire_large: 64,
    bush_small: 64,
    lamp_post: 64,
    lamp_post_2: 64,
    fence_long: 64,
    pillory: 64,
    well_large: 64,
    skull_pile: 64,
    chest_closed: 64,
    chest_open: 64,
    chest_medium: 64,
    chest_treasure: 64,
    cauldron_small: 64,
    cauldron_magic: 64,
    cooking_pot: 64,
    bucket_pair: 64,
    bucket_magic: 64,
    table_small: 64,
    table_large: 64,
    table_market: 64,
    market_stall_food: 64,
    market_stall_goods: 64,
    market_stall_large: 64,
    market_stall_covered: 64,
    crate_pile: 64,
    // Small props (32×48 canvas)
    barrel_single: 32,
    crate_small: 32,
    sack_single: 32,
    sack_pair: 32,
    sack_pile: 32,
    fence_short: 32,
    well_small: 32,
    cart_empty: 32,
    sign_village: 32,
    sign_forest: 32,
    sign_market: 32,
    sign_double: 32,
    gravestone_plain: 32,
    gravestone_cross: 32,
    gravestone_rounded: 32,
    mushroom_pile: 32,
  };

  switch (spriteType) {
    case 'npc':
      return getDisplaySize(spriteId);
    case 'creature':
      return getDisplaySize(spriteId);
    case 'building':
      return BUILDING_SIZES[spriteId] ?? 256;
    case 'prop':
      return PROP_SIZES[spriteId] ?? 64;
    default:
      return 48;
  }
}
