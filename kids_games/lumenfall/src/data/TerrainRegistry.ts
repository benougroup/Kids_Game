/**
 * TerrainRegistry - Centralized terrain type definitions
 *
 * Each terrain type specifies:
 * - height: Movement passability level (-3 to +3)
 * - movementType: Category for gameplay effects
 * - moveCostMultiplier: Speed penalty (1.0 = normal)
 * - frame: Sprite frame name
 * - atlas: Sprite atlas name
 */

export interface TerrainType {
  id: string;
  name: string;
  height: number;
  movementType: 'normal' | 'shallowWater' | 'deepWater' | 'sand' | 'mud' | 'ice' | 'blocked';
  moveCostMultiplier: number;
  frame: string;
  atlas: string;
  label?: string;
}

export const TERRAIN_REGISTRY: Record<string, TerrainType> = {
  // Ground level (height 0) - Normal walkable terrain
  grass_plain: {
    id: 'grass_plain',
    name: 'Plain Grass',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'grass_plain',
    atlas: 'terrain_grassland',
  },
  grass_flowers_blue: {
    id: 'grass_flowers_blue',
    name: 'Grass with Blue Flowers',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'grass_flowers_blue',
    atlas: 'terrain_grassland',
  },
  grass_flowers_yellow: {
    id: 'grass_flowers_yellow',
    name: 'Grass with Yellow Flowers',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'grass_flowers_yellow',
    atlas: 'terrain_grassland',
  },
  grass_dark: {
    id: 'grass_dark',
    name: 'Dark Grass',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'grass_dark',
    atlas: 'terrain_grassland',
  },
  grass_dirt_patch: {
    id: 'grass_dirt_patch',
    name: 'Grass with Dirt Patch',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'grass_dirt_patch',
    atlas: 'terrain_grassland',
  },

  // Sand (height 0) - Walkable but slower
  sand_plain: {
    id: 'sand_plain',
    name: 'Plain Sand',
    height: 0,
    movementType: 'sand',
    moveCostMultiplier: 1.1,
    frame: 'sand_plain',
    atlas: 'terrain_grassland',
  },
  sand_dunes: {
    id: 'sand_dunes',
    name: 'Sand Dunes',
    height: 0,
    movementType: 'sand',
    moveCostMultiplier: 1.2,
    frame: 'sand_dunes',
    atlas: 'terrain_grassland',
  },
  sand_dry: {
    id: 'sand_dry',
    name: 'Dry Sand',
    height: 0,
    movementType: 'sand',
    moveCostMultiplier: 1.1,
    frame: 'sand_dry',
    atlas: 'terrain_grassland',
  },
  sand_rocky: {
    id: 'sand_rocky',
    name: 'Rocky Sand',
    height: 0,
    movementType: 'sand',
    moveCostMultiplier: 1.15,
    frame: 'sand_rocky',
    atlas: 'terrain_grassland',
  },

  // Dirt (height 0) - Normal walkable
  dirt_plain: {
    id: 'dirt_plain',
    name: 'Plain Dirt',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'dirt_plain',
    atlas: 'terrain_grassland',
  },
  dirt_dark: {
    id: 'dirt_dark',
    name: 'Dark Dirt',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'dirt_dark',
    atlas: 'terrain_grassland',
  },
  dirt_plants: {
    id: 'dirt_plants',
    name: 'Dirt with Plants',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.05,
    frame: 'dirt_plants',
    atlas: 'terrain_grassland',
  },
  dirt_sand: {
    id: 'dirt_sand',
    name: 'Dirt and Sand Mix',
    height: 0,
    movementType: 'sand',
    moveCostMultiplier: 1.08,
    frame: 'dirt_sand',
    atlas: 'terrain_grassland',
  },

  // Water - Shallow (height -1) - Only for swimmers
  water_light: {
    id: 'water_light',
    name: 'Light Water',
    height: -0.5,
    movementType: 'shallowWater',
    moveCostMultiplier: 1.3,
    frame: 'water_light',
    atlas: 'terrain_grassland',
  },
  water_ripple: {
    id: 'water_ripple',
    name: 'Rippling Water',
    height: -0.75,
    movementType: 'shallowWater',
    moveCostMultiplier: 1.4,
    frame: 'water_ripple',
    atlas: 'terrain_grassland',
  },
  water_shore: {
    id: 'water_shore',
    name: 'Water Shore',
    height: -0.5,
    movementType: 'shallowWater',
    moveCostMultiplier: 1.2,
    frame: 'water_shore',
    atlas: 'terrain_grassland',
  },
  water_sand_edge: {
    id: 'water_sand_edge',
    name: 'Water Sand Edge',
    height: -0.5,
    movementType: 'shallowWater',
    moveCostMultiplier: 1.25,
    frame: 'water_sand_edge',
    atlas: 'terrain_grassland',
  },

  // Water - Deep (height -2) - Impassable for most
  water_mid: {
    id: 'water_mid',
    name: 'Mid-depth Water',
    height: -1.5,
    movementType: 'deepWater',
    moveCostMultiplier: 0,
    frame: 'water_mid',
    atlas: 'terrain_grassland',
  },
  water_deep: {
    id: 'water_deep',
    name: 'Deep Water',
    height: -2,
    movementType: 'deepWater',
    moveCostMultiplier: 0,
    frame: 'water_deep',
    atlas: 'terrain_grassland',
  },

  // Ice (height 0) - Slippery
  water_ice: {
    id: 'water_ice',
    name: 'Ice',
    height: 0,
    movementType: 'ice',
    moveCostMultiplier: 0.8,
    frame: 'water_ice',
    atlas: 'terrain_grassland',
  },

  // Foam/edges (height 0)
  water_foam: {
    id: 'water_foam',
    name: 'Water Foam',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'water_foam',
    atlas: 'terrain_grassland',
  },

  // Walls/Obstacles (height 2-3) - Impassable
  brick_wall: {
    id: 'brick_wall',
    name: 'Brick Wall',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'brick_wall',
    atlas: 'terrain_grassland',
  },

  // Dungeon tiles (height 0) - Normal walkable
  dungeon_floor: {
    id: 'dungeon_floor',
    name: 'Dungeon Floor',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'dungeon_floor',
    atlas: 'terrain_grassland',
  },
  dungeon_dirt: {
    id: 'dungeon_dirt',
    name: 'Dungeon Dirt',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.05,
    frame: 'dungeon_dirt',
    atlas: 'terrain_grassland',
  },

  // Dungeon walls (height 2+) - Impassable
  dungeon_wall: {
    id: 'dungeon_wall',
    name: 'Dungeon Wall',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_wall',
    atlas: 'terrain_grassland',
  },
  dungeon_wall_2: {
    id: 'dungeon_wall_2',
    name: 'Dungeon Wall 2',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_wall_2',
    atlas: 'terrain_grassland',
  },
  dungeon_wall_grey: {
    id: 'dungeon_wall_grey',
    name: 'Dungeon Grey Wall',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_wall_grey',
    atlas: 'terrain_grassland',
  },
  dungeon_wall_moss: {
    id: 'dungeon_wall_moss',
    name: 'Mossy Dungeon Wall',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_wall_moss',
    atlas: 'terrain_grassland',
  },
  dungeon_wall_wet: {
    id: 'dungeon_wall_wet',
    name: 'Wet Dungeon Wall',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_wall_wet',
    atlas: 'terrain_grassland',
  },

  // Other dungeon tiles
  dungeon_brick: {
    id: 'dungeon_brick',
    name: 'Dungeon Brick',
    height: 2,
    movementType: 'blocked',
    moveCostMultiplier: 0,
    frame: 'dungeon_brick',
    atlas: 'terrain_grassland',
  },
  dungeon_stone: {
    id: 'dungeon_stone',
    name: 'Dungeon Stone',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'dungeon_stone',
    atlas: 'terrain_grassland',
  },
  dungeon_grate: {
    id: 'dungeon_grate',
    name: 'Dungeon Grate',
    height: 1,
    movementType: 'normal',
    moveCostMultiplier: 1.05,
    frame: 'dungeon_grate',
    atlas: 'terrain_grassland',
  },
  cave_entrance: {
    id: 'cave_entrance',
    name: 'Cave Entrance',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'cave_entrance',
    atlas: 'terrain_grassland',
  },

  // Gold floor
  gold_floor: {
    id: 'gold_floor',
    name: 'Gold Floor',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.0,
    frame: 'gold_floor',
    atlas: 'terrain_grassland',
  },

  // Cracked floors (height 0)
  cracked_floor: {
    id: 'cracked_floor',
    name: 'Cracked Floor',
    height: 0,
    movementType: 'normal',
    moveCostMultiplier: 1.05,
    frame: 'cracked_floor',
    atlas: 'terrain_grassland',
  },
};

/**
 * Get terrain type by ID
 */
export function getTerrainType(id: string): TerrainType | undefined {
  return TERRAIN_REGISTRY[id];
}

/**
 * Get tile palette entry for map JSON (tilePalette format)
 */
export function getTilePaletteEntry(_tileId: string, terrain: TerrainType) {
  return {
    name: terrain.name,
    color: getTerrainColor(terrain.id),
    spriteId: terrain.id,
  };
}

/**
 * Get terrain metadata entry for map JSON (terrainMetaByTileId format)
 */
export function getTerrainMetadata(terrain: TerrainType) {
  return {
    terrainLevel: terrain.height,
    movementType: terrain.movementType,
    moveCostMultiplier: terrain.moveCostMultiplier,
  };
}

/**
 * Get display color for terrain in map editors
 */
function getTerrainColor(terrainId: string): string {
  const colors: Record<string, string> = {
    grass_plain: '#3a8f3a',
    grass_dark: '#2d6b2d',
    grass_flowers_blue: '#5aa35a',
    grass_flowers_yellow: '#6b9d3d',
    sand_plain: '#d4a574',
    sand_dunes: '#c9995a',
    dirt_plain: '#8b5a2b',
    dirt_dark: '#6b4423',
    water_light: '#7ab5e8',
    water_ripple: '#5aa3d8',
    water_mid: '#3d8ec9',
    water_deep: '#2450a8',
    water_shore: '#6aa3c8',
    brick_wall: '#a0522d',
    dungeon_floor: '#4a4a4a',
    dungeon_dirt: '#5a5a4a',
    dungeon_wall: '#2a2a2a',
    gold_floor: '#ffd700',
  };
  return colors[terrainId] ?? '#888888';
}
