/**
 * Test Map Definitions
 * 
 * Three maps for testing game mechanics:
 * 1. test_town   - Bright Hollow (starting town)
 * 2. test_forest - Whispering Forest
 * 3. test_dungeon - Shadow Caverns
 * 
 * All frame names verified against actual atlas JSON files.
 * 
 * TILE SIZE: 64px
 * MAP SIZE: 30x25 tiles = 1920x1600 world pixels
 * 
 * BORDER DESIGN (like Ragnarok Online):
 * - Outer 2 rows/cols = cliff walls (impassable, height 3)
 * - Only road exits at N/E/S/W are walkable through border
 * - Roads are 2 tiles wide
 */

import { MapData, MapTileEntry, MapEntityEntry, MapExit } from './MapBuilder';

const TILE = 64;

// ============================================================
// HELPER: Create a rectangle of tiles
// ============================================================
function fillRect(
  tiles: MapTileEntry[],
  x: number, y: number, w: number, h: number,
  frame: string, atlas: string, height: number,
  opts: Partial<MapTileEntry> = {}
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ x: x + dx, y: y + dy, frame, atlas, height, ...opts });
    }
  }
}

// ============================================================
// MAP 1: BRIGHT HOLLOW (Town)
// ============================================================
export function createTestTownData(): MapData {
  const COLS = 30;
  const ROWS = 25;

  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];
  const npcs: MapEntityEntry[] = [];
  const monsters: MapEntityEntry[] = [];

  // --- GROUND: Fill entire map with grass ---
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'grass_plain', 'terrain_grassland', 0);

  // --- GROUND: Dirt path - North-South road (cols 14-15, full height) ---
  fillRect(groundLayer, 14, 0, 2, ROWS, 'dirt_plain', 'terrain_grassland', 0);

  // --- GROUND: Dirt path - East-West road (rows 12-13, full width) ---
  fillRect(groundLayer, 0, 12, COLS, 2, 'dirt_plain', 'terrain_grassland', 0);

  // --- GROUND: Town plaza (center 6x6 area) ---
  fillRect(groundLayer, 12, 10, 6, 5, 'stone_plain', 'terrain_grassland', 0);

  // --- GROUND: Grass variety patches ---
  const grassVariants = ['grass_flowers_yellow', 'grass_flowers_blue', 'grass_dark', 'grass_dirt_patch'];
  const grassPatches = [
    { x: 3, y: 3 }, { x: 7, y: 5 }, { x: 5, y: 18 },
    { x: 20, y: 4 }, { x: 25, y: 7 }, { x: 22, y: 18 },
    { x: 8, y: 20 }, { x: 26, y: 20 }, { x: 4, y: 14 },
  ];
  grassPatches.forEach((p, i) => {
    groundLayer.push({ x: p.x, y: p.y, frame: grassVariants[i % grassVariants.length], atlas: 'terrain_grassland', height: 0 });
  });

  // --- GROUND: Small water pond (bottom-left area) ---
  fillRect(groundLayer, 3, 17, 3, 3, 'water_mid', 'terrain_grassland', -2, { isWater: true });
  fillRect(groundLayer, 2, 17, 1, 3, 'water_shore', 'terrain_grassland', -2, { isWater: true });
  fillRect(groundLayer, 3, 16, 3, 1, 'water_shore', 'terrain_grassland', -2, { isWater: true });

  // --- BORDER: Cliff walls (outer 2 rows/cols) ---
  // Top border (rows 0-1) - except north exit (cols 14-15)
  for (let x = 0; x < COLS; x++) {
    if (x < 14 || x > 15) {
      groundLayer.push({ x, y: 0, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: 1, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Bottom border (rows 23-24) - except south exit (cols 14-15)
  for (let x = 0; x < COLS; x++) {
    if (x < 14 || x > 15) {
      groundLayer.push({ x, y: ROWS - 2, frame: 'cliff_dirt_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: ROWS - 1, frame: 'cliff_dirt_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Left border (cols 0-1) - except west exit (rows 12-13)
  for (let y = 0; y < ROWS; y++) {
    if (y < 12 || y > 13) {
      groundLayer.push({ x: 0, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Right border (cols 28-29) - except east exit (rows 12-13)
  for (let y = 0; y < ROWS; y++) {
    if (y < 12 || y > 13) {
      groundLayer.push({ x: COLS - 2, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: COLS - 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }

  // --- OBJECTS: Trees around the map (not on roads or plaza) ---
  const treePosns = [
    { x: 3, y: 4 }, { x: 5, y: 3 }, { x: 7, y: 6 }, { x: 4, y: 8 },
    { x: 3, y: 21 }, { x: 6, y: 22 }, { x: 8, y: 19 },
    { x: 20, y: 3 }, { x: 22, y: 5 }, { x: 25, y: 4 }, { x: 27, y: 6 },
    { x: 21, y: 19 }, { x: 24, y: 21 }, { x: 26, y: 19 }, { x: 27, y: 22 },
  ];
  treePosns.forEach(p => {
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_oak_large', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  });

  // Pine trees near border
  const pinePosns = [{ x: 9, y: 4 }, { x: 11, y: 3 }, { x: 18, y: 4 }, { x: 20, y: 3 }];
  pinePosns.forEach(p => {
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_pine_tall', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  });

  // --- OBJECTS: Bushes ---
  const bushPosns = [
    { x: 6, y: 10 }, { x: 7, y: 15 }, { x: 9, y: 18 },
    { x: 20, y: 10 }, { x: 22, y: 15 }, { x: 19, y: 20 },
  ];
  bushPosns.forEach(p => {
    objectLayer.push({ x: p.x, y: p.y, frame: 'bush_small', atlas: 'objects_props_v002', height: 1 });
  });

  // --- OBJECTS: Fountain in plaza center ---
  // Fountain at (12,9) covering tiles (12-14, 9-11) - 3x3 display, left of center plaza
  // Road runs through cols 14-15; fountain at col 12 keeps road clear.
  // Player spawns at (15,13) which is south of the road crossing, fully walkable.
  objectLayer.push({ x: 12, y: 9, frame: 'fountain_round', atlas: 'objects_props_v003', height: 2, widthTiles: 3, heightTiles: 3 });

  // --- OBJECTS: Well ---
  objectLayer.push({ x: 8, y: 12, frame: 'well_large', atlas: 'objects_props_v002', height: 2 });

  // --- OBJECTS: Lamp posts along roads ---
  const lampPosns = [{ x: 13, y: 5 }, { x: 16, y: 5 }, { x: 13, y: 19 }, { x: 16, y: 19 }];
  lampPosns.forEach(p => {
    objectLayer.push({ x: p.x, y: p.y, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2 });
  });

  // --- OBJECTS: Signs at road junctions ---
  objectLayer.push({ x: 13, y: 11, frame: 'sign_village', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 16, y: 11, frame: 'sign_forest', atlas: 'objects_props_v002', height: 1 });

  // --- OBJECTS: Market stalls ---
  objectLayer.push({ x: 8, y: 8, frame: 'market_stall_goods', atlas: 'objects_props_v002', height: 2, widthTiles: 2, heightTiles: 1 });
  objectLayer.push({ x: 8, y: 15, frame: 'market_stall_food', atlas: 'objects_props_v002', height: 2, widthTiles: 2, heightTiles: 1 });

  // --- STRUCTURES: Buildings ---
  // Building sprites are 384x256px (3:2 ratio). Using widthTiles:3, heightTiles:2 = 192x128px
  // preserves the correct aspect ratio so tops/flags are not cut off.
  // Inn (top-left area)
  structureLayer.push({ x: 4, y: 4, frame: 'tavern_blue_roof', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Blacksmith (top-right area)
  structureLayer.push({ x: 22, y: 4, frame: 'blacksmith_forge_large', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Market (left-center)
  structureLayer.push({ x: 4, y: 13, frame: 'market_food_building', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Magic Shop (right-center)
  structureLayer.push({ x: 22, y: 13, frame: 'magic_shop_crystal', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Chapel (bottom-left)
  structureLayer.push({ x: 4, y: 19, frame: 'chapel_large', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Alchemy shop (bottom-right)
  structureLayer.push({ x: 22, y: 19, frame: 'alchemy_shop', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  // Watchtower near north exit (384x256 = 3:2, use widthTiles:3, heightTiles:2 = 192x128px)
  // Placed at row 3 so the full tower is visible above the cliff border
  structureLayer.push({ x: 11, y: 3, frame: 'watchtower_small', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });
  structureLayer.push({ x: 16, y: 3, frame: 'watchtower_small', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 2 });

  // --- NPCs ---
  npcs.push({ x: 13, y: 3, entityId: 'guard' });           // Guard at north gate
  npcs.push({ x: 16, y: 3, entityId: 'guard2' });          // Guard at north gate
  npcs.push({ x: 14, y: 14, entityId: 'apprentice' });     // Apprentice near plaza
  npcs.push({ x: 8, y: 9, entityId: 'merchant' });         // Merchant at market
  npcs.push({ x: 15, y: 12, entityId: 'elder' });          // Elder near fountain (south-east)
  npcs.push({ x: 22, y: 14, entityId: 'scholar' });        // Scholar at magic shop
  npcs.push({ x: 10, y: 13, entityId: 'child' });          // Child wandering
  npcs.push({ x: 22, y: 5, entityId: 'blacksmith' });      // Blacksmith at forge
  npcs.push({ x: 4, y: 14, entityId: 'innkeeper' });       // Innkeeper at market

  // --- EXITS ---
  const exits: MapExit[] = [
    {
      direction: 'north',
      tileX: 14, tileY: 0,
      width: 2,
      targetMap: 'test_forest',
      targetTileX: 14, targetTileY: 23,
    },
    {
      direction: 'south',
      tileX: 14, tileY: ROWS - 1,
      width: 2,
      targetMap: 'test_dungeon',
      targetTileX: 14, targetTileY: 1,
    },
    {
      direction: 'west',
      tileX: 0, tileY: 12,
      width: 2,
      targetMap: 'test_town',
      targetTileX: 27, targetTileY: 12,
    },
    {
      direction: 'east',
      tileX: COLS - 1, tileY: 12,
      width: 2,
      targetMap: 'test_town',
      targetTileX: 2, targetTileY: 12,
    },
  ];

  return {
    id: 'test_town',
    name: 'Bright Hollow',
    cols: COLS,
    rows: ROWS,
    tileSize: TILE,
    ambientLight: 0.85,
    groundLayer,
    objectLayer,
    structureLayer,
    npcs,
    monsters,
    exits,
  };
}

// ============================================================
// MAP 2: WHISPERING FOREST
// ============================================================
export function createTestForestData(): MapData {
  const COLS = 30;
  const ROWS = 25;

  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];
  const npcs: MapEntityEntry[] = [];
  const monsters: MapEntityEntry[] = [];

  // --- GROUND: Fill with grass ---
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'grass_dark', 'terrain_grassland', 0);

  // --- GROUND: Dirt path through forest (N-S) ---
  fillRect(groundLayer, 14, 0, 2, ROWS, 'dirt_plain', 'terrain_grassland', 0);

  // --- GROUND: Small stream (water) ---
  fillRect(groundLayer, 7, 8, 1, 10, 'water_mid', 'terrain_grassland', -2, { isWater: true });
  fillRect(groundLayer, 8, 8, 1, 10, 'water_shore', 'terrain_grassland', -2, { isWater: true });

  // --- GROUND: Grass variety ---
  const grassPatches = [
    { x: 4, y: 5 }, { x: 10, y: 7 }, { x: 18, y: 5 }, { x: 25, y: 8 },
    { x: 5, y: 15 }, { x: 12, y: 18 }, { x: 20, y: 16 }, { x: 27, y: 14 },
  ];
  grassPatches.forEach(p => {
    groundLayer.push({ x: p.x, y: p.y, frame: 'grass_flowers_yellow', atlas: 'terrain_grassland', height: 0 });
  });

  // --- BORDER: Cliff walls ---
  for (let x = 0; x < COLS; x++) {
    if (x < 14 || x > 15) {
      groundLayer.push({ x, y: 0, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: 1, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: ROWS - 2, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: ROWS - 1, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  for (let y = 0; y < ROWS; y++) {
    if (y < 12 || y > 13) {
      groundLayer.push({ x: 0, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: COLS - 2, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: COLS - 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }

  // --- OBJECTS: Dense forest trees ---
  const forestTrees = [
    { x: 3, y: 3 }, { x: 5, y: 4 }, { x: 3, y: 7 }, { x: 6, y: 6 },
    { x: 9, y: 3 }, { x: 11, y: 5 }, { x: 10, y: 8 },
    { x: 18, y: 3 }, { x: 20, y: 4 }, { x: 22, y: 3 }, { x: 25, y: 5 },
    { x: 19, y: 7 }, { x: 23, y: 6 }, { x: 26, y: 4 },
    { x: 3, y: 12 }, { x: 5, y: 14 }, { x: 3, y: 17 }, { x: 6, y: 16 },
    { x: 9, y: 14 }, { x: 11, y: 17 }, { x: 10, y: 20 },
    { x: 18, y: 13 }, { x: 20, y: 16 }, { x: 22, y: 14 }, { x: 25, y: 17 },
    { x: 19, y: 20 }, { x: 23, y: 19 }, { x: 26, y: 21 },
  ];
  forestTrees.forEach((p, i) => {
    const frame = i % 3 === 0 ? 'tree_pine_tall' : i % 3 === 1 ? 'tree_oak_large' : 'tree_dead';
    objectLayer.push({ x: p.x, y: p.y, frame, atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  });

  // --- OBJECTS: Rocks near stream ---
  objectLayer.push({ x: 6, y: 9, frame: 'rock_large', atlas: 'objects_props_v002', height: 2 });
  objectLayer.push({ x: 9, y: 12, frame: 'rock_large', atlas: 'objects_props_v002', height: 2 });

  // --- OBJECTS: Ancient ruins in forest ---
  objectLayer.push({ x: 20, y: 10, frame: 'ruin_arch_stone', atlas: 'objects_props_v003', height: 2, widthTiles: 2, heightTiles: 2 });
  objectLayer.push({ x: 22, y: 11, frame: 'skull_pile', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 19, y: 12, frame: 'gravestone_cross', atlas: 'objects_props_v002', height: 1 });

  // --- OBJECTS: Campfire ---
  objectLayer.push({ x: 16, y: 10, frame: 'campfire', atlas: 'objects_props_v002', height: 1 });

  // --- NPCs ---
  npcs.push({ x: 14, y: 22, entityId: 'ranger' });    // Ranger near south exit
  npcs.push({ x: 20, y: 9, entityId: 'hermit' });     // Hermit at ruins

  // --- MONSTERS ---
  monsters.push({ x: 5, y: 10, entityId: 'wolf' });
  monsters.push({ x: 22, y: 15, entityId: 'goblin' });
  monsters.push({ x: 25, y: 10, entityId: 'goblin' });
  monsters.push({ x: 10, y: 18, entityId: 'slime' });

  // --- EXITS ---
  const exits: MapExit[] = [
    {
      direction: 'south',
      tileX: 14, tileY: ROWS - 1,
      width: 2,
      targetMap: 'test_town',
      targetTileX: 14, targetTileY: 2,
    },
    {
      direction: 'north',
      tileX: 14, tileY: 0,
      width: 2,
      targetMap: 'test_forest',
      targetTileX: 14, targetTileY: 23,
    },
  ];

  return {
    id: 'test_forest',
    name: 'Whispering Forest',
    cols: COLS,
    rows: ROWS,
    tileSize: TILE,
    ambientLight: 0.65,
    groundLayer,
    objectLayer,
    structureLayer,
    npcs,
    monsters,
    exits,
  };
}

// ============================================================
// MAP 3: SHADOW CAVERNS (Dungeon)
// ============================================================
export function createTestDungeonData(): MapData {
  const COLS = 25;
  const ROWS = 20;

  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];
  const npcs: MapEntityEntry[] = [];
  const monsters: MapEntityEntry[] = [];

  // --- GROUND: Fill with dungeon floor ---
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'dungeon_floor', 'terrain_grassland', 0);

  // --- GROUND: Main corridor (N-S) ---
  fillRect(groundLayer, 11, 0, 3, ROWS, 'dungeon_stone', 'terrain_grassland', 0);

  // --- GROUND: Cross corridor (E-W) ---
  fillRect(groundLayer, 0, 9, COLS, 2, 'dungeon_stone', 'terrain_grassland', 0);

  // --- GROUND: Lava pit (center-right) ---
  fillRect(groundLayer, 17, 5, 4, 4, 'lava_floor', 'terrain_grassland', -1, { damage: 5 });

  // --- GROUND: Water pool (center-left) ---
  fillRect(groundLayer, 4, 5, 4, 4, 'water_mid', 'terrain_grassland', -2, { isWater: true });

  // --- BORDER: Dungeon walls ---
  for (let x = 0; x < COLS; x++) {
    if (x < 11 || x > 13) {
      groundLayer.push({ x, y: 0, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x, y: 1, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x, y: ROWS - 2, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x, y: ROWS - 1, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
    }
  }
  for (let y = 0; y < ROWS; y++) {
    if (y < 9 || y > 10) {
      groundLayer.push({ x: 0, y, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x: 1, y, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x: COLS - 2, y, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
      groundLayer.push({ x: COLS - 1, y, frame: 'dungeon_wall', atlas: 'terrain_grassland', height: 3 });
    }
  }

  // --- OBJECTS: Dungeon props ---
  objectLayer.push({ x: 8, y: 4, frame: 'chest_closed', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 16, y: 4, frame: 'sarcophagus', atlas: 'objects_props_v003', height: 2 });
  objectLayer.push({ x: 14, y: 14, frame: 'skull_pile', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 8, y: 14, frame: 'gravestone_plain', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 20, y: 14, frame: 'gravestone_rounded', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 3, y: 3, frame: 'barrel_single', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 21, y: 3, frame: 'barrel_pair', atlas: 'objects_props_v002', height: 1 });

  // --- OBJECTS: Ruins ---
  objectLayer.push({ x: 4, y: 13, frame: 'ruin_arch_stone', atlas: 'objects_props_v003', height: 2, widthTiles: 2, heightTiles: 2 });
  objectLayer.push({ x: 18, y: 13, frame: 'tower_ruins', atlas: 'objects_props_v003', height: 2, widthTiles: 2, heightTiles: 2 });

  // --- NPCs ---
  npcs.push({ x: 12, y: 5, entityId: 'elder', name: 'Ancient Spirit', dialogueKey: 'ancient_spirit' });

  // --- MONSTERS ---
  monsters.push({ x: 5, y: 3, entityId: 'skeleton' });
  monsters.push({ x: 20, y: 3, entityId: 'skeleton' });
  monsters.push({ x: 5, y: 15, entityId: 'ghost' });
  monsters.push({ x: 20, y: 15, entityId: 'ghost' });
  monsters.push({ x: 12, y: 15, entityId: 'shadow_stalker' });

  // --- EXITS ---
  const exits: MapExit[] = [
    {
      direction: 'north',
      tileX: 11, tileY: 0,
      width: 3,
      targetMap: 'test_town',
      targetTileX: 14, targetTileY: ROWS - 2,
    },
  ];

  return {
    id: 'test_dungeon',
    name: 'Shadow Caverns',
    cols: COLS,
    rows: ROWS,
    tileSize: TILE,
    ambientLight: 0.2,
    groundLayer,
    objectLayer,
    structureLayer,
    npcs,
    monsters,
    exits,
  };
}
