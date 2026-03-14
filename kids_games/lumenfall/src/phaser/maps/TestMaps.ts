/**
 * Test Map Data Files
 * 
 * Three test maps:
 * 1. TestTown - Starting village with NPCs, buildings, roads
 * 2. TestForest - Forest area with trees, monsters, path
 * 3. TestDungeon - Underground dungeon with dark tiles, skeletons
 * 
 * Maps connect: Town <-> Forest <-> Dungeon
 */

import { MapData, MapTileEntry, fillRect, hLine, vLine, circle } from './MapBuilder';

// ===================== TEST TOWN MAP =====================
export function createTestTownData(): MapData {
  const COLS = 30;
  const ROWS = 25;
  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];

  // === GROUND LAYER ===
  // Fill entire map with grass
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'grass_plain', 'terrain_grassland', 0);

  // Town plaza (stone floor in center)
  fillRect(groundLayer, 10, 8, 10, 9, 'stone_cobble', 'terrain_grassland', 0);

  // North road (leading to forest)
  hLine(groundLayer, 13, 0, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 1, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 2, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 3, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 4, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 5, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 6, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 7, 4, 'dirt_plain', 'terrain_grassland', 0);

  // South road (leading to dungeon)
  hLine(groundLayer, 13, 17, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 18, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 19, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 20, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 21, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 22, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 23, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 24, 4, 'dirt_plain', 'terrain_grassland', 0);

  // East road (leading to market)
  vLine(groundLayer, 20, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 21, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 22, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 23, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 24, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 25, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 26, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 27, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 28, 11, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 29, 11, 3, 'dirt_plain', 'terrain_grassland', 0);

  // Water pond (top-left area)
  circle(groundLayer, 4, 5, 2, 'water_deep', 'terrain_grassland', -2, { isWater: true, damage: 0 });
  // Shallow water edge
  circle(groundLayer, 4, 5, 3, 'water_shallow', 'terrain_grassland', -1, { isWater: true });

  // Dirt path around pond
  groundLayer.push({ x: 7, y: 5, frame: 'dirt_plain', atlas: 'terrain_grassland', height: 0 });
  groundLayer.push({ x: 7, y: 4, frame: 'dirt_plain', atlas: 'terrain_grassland', height: 0 });
  groundLayer.push({ x: 7, y: 6, frame: 'dirt_plain', atlas: 'terrain_grassland', height: 0 });

  // Sand patch (bottom-right)
  fillRect(groundLayer, 22, 18, 6, 5, 'sand_plain', 'terrain_grassland', 0);

  // === OBJECT LAYER ===
  // Trees around edges
  // Top-left forest cluster
  for (const [tx, ty] of [[1,1],[2,1],[3,1],[1,2],[2,3],[4,1],[5,1],[5,2],[6,1]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'tree_oak', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  }
  // Top-right trees
  for (const [tx, ty] of [[24,1],[25,1],[26,1],[27,1],[28,1],[24,2],[28,2],[27,2]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'tree_pine', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  }
  // Bottom-left trees
  for (const [tx, ty] of [[1,18],[2,18],[1,19],[2,20],[3,19],[1,21],[2,22],[3,22]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'tree_oak', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  }

  // Bushes around plaza
  for (const [tx, ty] of [[9,8],[9,9],[9,10],[9,11],[9,12],[9,13],[9,14],[9,15],[9,16],
                           [20,8],[20,9],[20,10],[20,11],[20,12],[20,13],[20,14],[20,15],[20,16]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'bush_large', atlas: 'objects_props_v002', height: 1 });
  }

  // Fountain in plaza center
  objectLayer.push({ x: 14, y: 11, frame: 'fountain', atlas: 'objects_props_v003', height: 2, widthTiles: 2, heightTiles: 2 });

  // Lamp posts along north road
  objectLayer.push({ x: 12, y: 3, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2 });
  objectLayer.push({ x: 17, y: 3, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2 });
  objectLayer.push({ x: 12, y: 6, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2 });
  objectLayer.push({ x: 17, y: 6, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2 });

  // Signs
  objectLayer.push({ x: 13, y: 7, frame: 'sign_village', atlas: 'objects_props_v002', height: 1 });
  objectLayer.push({ x: 13, y: 16, frame: 'sign_forest', atlas: 'objects_props_v002', height: 1 });

  // Well in plaza
  objectLayer.push({ x: 11, y: 10, frame: 'well_stone', atlas: 'objects_props_v002', height: 2 });

  // Barrels near buildings
  for (const [tx, ty] of [[8,9],[8,10],[21,9],[21,10]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'barrel_single', atlas: 'objects_props_v002', height: 1 });
  }

  // Tombstones (small graveyard bottom-left)
  for (const [tx, ty] of [[3,20],[4,20],[5,20],[3,21],[4,21],[5,21]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'tombstone_plain', atlas: 'objects_props_v002', height: 1 });
  }

  // === STRUCTURE LAYER ===
  // Inn (top-right of plaza)
  structureLayer.push({ x: 10, y: 8, frame: 'building_inn', atlas: 'buildings_v002', height: 3, widthTiles: 3, heightTiles: 3 });

  // Blacksmith (left of plaza)
  structureLayer.push({ x: 6, y: 10, frame: 'building_blacksmith', atlas: 'buildings_v002', height: 3, widthTiles: 3, heightTiles: 3 });

  // Market stall (right of plaza)
  structureLayer.push({ x: 21, y: 9, frame: 'building_market', atlas: 'buildings_v002', height: 3, widthTiles: 3, heightTiles: 3 });

  // Guard tower (north entrance)
  structureLayer.push({ x: 11, y: 1, frame: 'building_tower', atlas: 'buildings_v003', height: 3, widthTiles: 2, heightTiles: 3 });
  structureLayer.push({ x: 17, y: 1, frame: 'building_tower', atlas: 'buildings_v003', height: 3, widthTiles: 2, heightTiles: 3 });

  // Elder's house (bottom area)
  structureLayer.push({ x: 7, y: 18, frame: 'building_cottage', atlas: 'buildings_v002', height: 3, widthTiles: 3, heightTiles: 3 });

  // Magic shop
  structureLayer.push({ x: 17, y: 18, frame: 'building_magic', atlas: 'buildings_v003', height: 3, widthTiles: 3, heightTiles: 3 });

  return {
    id: 'test_town',
    name: 'Bright Hollow',
    cols: COLS,
    rows: ROWS,
    tileSize: 64,
    bgMusic: 'town_theme',
    ambientLight: 0.8,

    groundLayer,
    objectLayer,
    structureLayer,

    npcs: [
      { x: 15, y: 6, entityId: 'guard', dialogueKey: 'guard_north' },
      { x: 14, y: 17, entityId: 'guard', name: 'South Guard', dialogueKey: 'guard_south' },
      { x: 12, y: 12, entityId: 'apprentice', dialogueKey: 'apprentice_default' },
      { x: 16, y: 12, entityId: 'merchant', dialogueKey: 'merchant_default' },
      { x: 9, y: 20, entityId: 'elder', dialogueKey: 'elder_default' },
      { x: 19, y: 12, entityId: 'blacksmith', dialogueKey: 'blacksmith_default' },
      { x: 13, y: 13, entityId: 'innkeeper', dialogueKey: 'innkeeper_default' },
      { x: 5, y: 15, entityId: 'villager', name: 'Mira', dialogueKey: 'villager_mira' },
      { x: 18, y: 20, entityId: 'mage', dialogueKey: 'mage_default' },
      { x: 7, y: 12, entityId: 'child', name: 'Pip', dialogueKey: 'child_pip' },
    ],

    monsters: [],  // No monsters in town (they appear at night via GameScene)

    exits: [
      { direction: 'north', tileX: 13, tileY: 0, width: 4, targetMap: 'test_forest', targetTileX: 13, targetTileY: 23 },
      { direction: 'south', tileX: 13, tileY: 24, width: 4, targetMap: 'test_dungeon', targetTileX: 13, targetTileY: 1 },
      { direction: 'east', tileX: 29, tileY: 11, width: 3, targetMap: 'test_market', targetTileX: 1, targetTileY: 11 },
    ],
  };
}

// ===================== TEST FOREST MAP =====================
export function createTestForestData(): MapData {
  const COLS = 30;
  const ROWS = 25;
  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];

  // Fill with grass
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'grass_plain', 'terrain_grassland', 0);

  // Darker grass patches
  for (let i = 0; i < 20; i++) {
    const px = Math.floor(Math.random() * COLS);
    const py = Math.floor(Math.random() * ROWS);
    fillRect(groundLayer, px, py, 2, 2, 'grass_dark', 'terrain_grassland', 0);
  }

  // Path through forest (south to north)
  hLine(groundLayer, 13, 0, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 1, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 2, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 3, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 4, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 5, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 6, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 7, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 8, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 9, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 10, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 11, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 12, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 13, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 14, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 15, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 16, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 17, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 18, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 19, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 20, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 21, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 22, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 23, 4, 'dirt_plain', 'terrain_grassland', 0);
  hLine(groundLayer, 13, 24, 4, 'dirt_plain', 'terrain_grassland', 0);

  // Side path to ruins (east)
  vLine(groundLayer, 17, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 18, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 19, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 20, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 21, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 22, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 23, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 24, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 25, 10, 3, 'dirt_plain', 'terrain_grassland', 0);
  vLine(groundLayer, 26, 10, 3, 'dirt_plain', 'terrain_grassland', 0);

  // Forest stream (water)
  vLine(groundLayer, 8, 5, 8, 'water_shallow', 'terrain_grassland', -1, { isWater: true });
  vLine(groundLayer, 9, 3, 10, 'water_deep', 'terrain_grassland', -2, { isWater: true, damage: 0 });
  vLine(groundLayer, 10, 5, 8, 'water_shallow', 'terrain_grassland', -1, { isWater: true });

  // Ruins clearing (east side)
  fillRect(groundLayer, 22, 8, 6, 6, 'stone_cobble', 'terrain_grassland', 0);

  // === OBJECTS ===
  // Dense trees everywhere except path
  const treePositions = [
    [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
    [11,1],[12,1],[17,1],[18,1],[19,1],[20,1],[21,1],[22,1],[23,1],[24,1],[25,1],[26,1],[27,1],[28,1],[29,1],
    [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[11,2],[12,2],[17,2],[18,2],[19,2],[20,2],[21,2],[22,2],[23,2],[24,2],[25,2],[26,2],[27,2],[28,2],[29,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[11,3],[12,3],[17,3],[18,3],[19,3],[20,3],[21,3],[22,3],[23,3],[24,3],[25,3],[26,3],[27,3],[28,3],[29,3],
    [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[11,4],[12,4],[17,4],[18,4],[19,4],[20,4],[21,4],[22,4],[23,4],[24,4],[25,4],[26,4],[27,4],[28,4],[29,4],
    [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[11,5],[12,5],[17,5],[18,5],[19,5],[20,5],[21,5],[22,5],[23,5],[24,5],[25,5],[26,5],[27,5],[28,5],[29,5],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[11,6],[12,6],[17,6],[18,6],[19,6],[20,6],[21,6],[22,6],[23,6],[24,6],[25,6],[26,6],[27,6],[28,6],[29,6],
    [1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[11,7],[12,7],[17,7],[18,7],[19,7],[20,7],[21,7],[22,7],[23,7],[24,7],[25,7],[26,7],[27,7],[28,7],[29,7],
    [1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[11,8],[12,8],[17,8],[18,8],[19,8],[20,8],[21,8],
    [1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[11,9],[12,9],[17,9],[18,9],[19,9],[20,9],[21,9],
    [1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[11,10],[12,10],
    [1,11],[2,11],[3,11],[4,11],[5,11],[6,11],[11,11],[12,11],
    [1,12],[2,12],[3,12],[4,12],[5,12],[6,12],[11,12],[12,12],[27,12],[28,12],[29,12],
    [1,13],[2,13],[3,13],[4,13],[5,13],[6,13],[11,13],[12,13],[27,13],[28,13],[29,13],
    [1,14],[2,14],[3,14],[4,14],[5,14],[6,14],[11,14],[12,14],[17,14],[18,14],[19,14],[20,14],[21,14],[22,14],[23,14],[24,14],[25,14],[26,14],[27,14],[28,14],[29,14],
    [1,15],[2,15],[3,15],[4,15],[5,15],[6,15],[11,15],[12,15],[17,15],[18,15],[19,15],[20,15],[21,15],[22,15],[23,15],[24,15],[25,15],[26,15],[27,15],[28,15],[29,15],
    [1,16],[2,16],[3,16],[4,16],[5,16],[6,16],[11,16],[12,16],[17,16],[18,16],[19,16],[20,16],[21,16],[22,16],[23,16],[24,16],[25,16],[26,16],[27,16],[28,16],[29,16],
    [1,17],[2,17],[3,17],[4,17],[5,17],[6,17],[11,17],[12,17],[17,17],[18,17],[19,17],[20,17],[21,17],[22,17],[23,17],[24,17],[25,17],[26,17],[27,17],[28,17],[29,17],
    [1,18],[2,18],[3,18],[4,18],[5,18],[6,18],[11,18],[12,18],[17,18],[18,18],[19,18],[20,18],[21,18],[22,18],[23,18],[24,18],[25,18],[26,18],[27,18],[28,18],[29,18],
    [1,19],[2,19],[3,19],[4,19],[5,19],[6,19],[11,19],[12,19],[17,19],[18,19],[19,19],[20,19],[21,19],[22,19],[23,19],[24,19],[25,19],[26,19],[27,19],[28,19],[29,19],
    [1,20],[2,20],[3,20],[4,20],[5,20],[6,20],[11,20],[12,20],[17,20],[18,20],[19,20],[20,20],[21,20],[22,20],[23,20],[24,20],[25,20],[26,20],[27,20],[28,20],[29,20],
    [1,21],[2,21],[3,21],[4,21],[5,21],[6,21],[11,21],[12,21],[17,21],[18,21],[19,21],[20,21],[21,21],[22,21],[23,21],[24,21],[25,21],[26,21],[27,21],[28,21],[29,21],
    [1,22],[2,22],[3,22],[4,22],[5,22],[6,22],[11,22],[12,22],[17,22],[18,22],[19,22],[20,22],[21,22],[22,22],[23,22],[24,22],[25,22],[26,22],[27,22],[28,22],[29,22],
    [1,23],[2,23],[3,23],[4,23],[5,23],[6,23],[11,23],[12,23],[17,23],[18,23],[19,23],[20,23],[21,23],[22,23],[23,23],[24,23],[25,23],[26,23],[27,23],[28,23],[29,23],
  ];

  const treeTypes = ['tree_oak', 'tree_pine', 'tree_dead', 'tree_oak', 'tree_oak'];
  for (const [tx, ty] of treePositions) {
    const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    objectLayer.push({ x: tx, y: ty, frame: treeType, atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2 });
  }

  // Ruins structures
  structureLayer.push({ x: 22, y: 8, frame: 'ruins_arch', atlas: 'objects_props_v003', height: 3, widthTiles: 2, heightTiles: 2 });
  structureLayer.push({ x: 25, y: 8, frame: 'ruins_wall', atlas: 'objects_props_v003', height: 3, widthTiles: 2, heightTiles: 2 });
  structureLayer.push({ x: 22, y: 11, frame: 'ruins_pillar', atlas: 'objects_props_v003', height: 2 });
  structureLayer.push({ x: 26, y: 11, frame: 'ruins_pillar', atlas: 'objects_props_v003', height: 2 });

  // Campfire near ruins
  objectLayer.push({ x: 24, y: 10, frame: 'campfire', atlas: 'objects_props_v002', height: 1 });

  // Chest in ruins
  objectLayer.push({ x: 23, y: 10, frame: 'chest_closed', atlas: 'objects_props_v003', height: 1 });

  return {
    id: 'test_forest',
    name: 'Whispering Forest',
    cols: COLS,
    rows: ROWS,
    tileSize: 64,
    ambientLight: 0.5,  // Darker forest

    groundLayer,
    objectLayer,
    structureLayer,

    npcs: [
      { x: 15, y: 5, entityId: 'ranger', dialogueKey: 'ranger_forest' },
      { x: 24, y: 10, entityId: 'hermit', dialogueKey: 'hermit_ruins' },
    ],

    monsters: [
      { x: 3, y: 8, entityId: 'wolf' },
      { x: 5, y: 12, entityId: 'wolf' },
      { x: 3, y: 16, entityId: 'goblin' },
      { x: 6, y: 18, entityId: 'goblin' },
      { x: 28, y: 5, entityId: 'slime' },
      { x: 28, y: 15, entityId: 'slime' },
    ],

    exits: [
      { direction: 'south', tileX: 13, tileY: 24, width: 4, targetMap: 'test_town', targetTileX: 13, targetTileY: 1 },
      { direction: 'north', tileX: 13, tileY: 0, width: 4, targetMap: 'test_dungeon_entrance', targetTileX: 13, targetTileY: 23 },
    ],
  };
}

// ===================== TEST DUNGEON MAP =====================
export function createTestDungeonData(): MapData {
  const COLS = 25;
  const ROWS = 20;
  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];

  // Fill with dark stone
  fillRect(groundLayer, 0, 0, COLS, ROWS, 'stone_dark', 'terrain_grassland', 0);

  // Main corridor (horizontal)
  fillRect(groundLayer, 2, 8, 21, 4, 'stone_cobble', 'terrain_grassland', 0);

  // North room
  fillRect(groundLayer, 8, 1, 9, 7, 'stone_cobble', 'terrain_grassland', 0);

  // South room
  fillRect(groundLayer, 8, 12, 9, 7, 'stone_cobble', 'terrain_grassland', 0);

  // East room
  fillRect(groundLayer, 18, 5, 5, 10, 'stone_cobble', 'terrain_grassland', 0);

  // Lava pit in south room
  circle(groundLayer, 12, 15, 2, 'lava', 'terrain_grassland', -2, { damage: 5 });

  // Water pool in north room
  circle(groundLayer, 12, 4, 2, 'water_deep', 'terrain_grassland', -2, { isWater: true });

  // Entrance from town
  hLine(groundLayer, 11, 0, 3, 'stone_cobble', 'terrain_grassland', 0);
  hLine(groundLayer, 11, 1, 3, 'stone_cobble', 'terrain_grassland', 0);

  // === OBJECTS ===
  // Torches on walls
  for (const [tx, ty] of [[8,8],[12,8],[16,8],[8,11],[12,11],[16,11],[8,1],[16,1],[8,7],[16,7]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'torch', atlas: 'objects_props_v002', height: 1 });
  }

  // Bones and skulls
  for (const [tx, ty] of [[9,9],[10,10],[14,9],[15,10],[9,3],[14,3]]) {
    objectLayer.push({ x: tx, y: ty, frame: 'skull_pile', atlas: 'objects_props_v002', height: 0 });
  }

  // Chests
  objectLayer.push({ x: 20, y: 7, frame: 'chest_gold', atlas: 'objects_props_v003', height: 1 });
  objectLayer.push({ x: 20, y: 12, frame: 'chest_closed', atlas: 'objects_props_v003', height: 1 });

  // Cauldron
  objectLayer.push({ x: 11, y: 3, frame: 'cauldron', atlas: 'objects_props_v003', height: 1 });

  // === STRUCTURES ===
  // Stone walls (impassable)
  // These are the outer walls - already impassable due to stone_dark height
  // Add some inner pillars
  for (const [tx, ty] of [[9,2],[15,2],[9,6],[15,6],[19,6],[19,13],[22,6],[22,13]]) {
    structureLayer.push({ x: tx, y: ty, frame: 'stone_pillar', atlas: 'objects_props_v003', height: 3 });
  }

  return {
    id: 'test_dungeon',
    name: 'Shadow Caverns',
    cols: COLS,
    rows: ROWS,
    tileSize: 64,
    ambientLight: 0.2,  // Very dark dungeon

    groundLayer,
    objectLayer,
    structureLayer,

    npcs: [
      { x: 12, y: 2, entityId: 'ghost_npc', name: 'Ancient Spirit', dialogueKey: 'ghost_dungeon' },
    ],

    monsters: [
      { x: 10, y: 9, entityId: 'skeleton' },
      { x: 14, y: 10, entityId: 'skeleton' },
      { x: 9, y: 4, entityId: 'ghost' },
      { x: 15, y: 4, entityId: 'ghost' },
      { x: 20, y: 8, entityId: 'shadow_stalker' },
      { x: 20, y: 11, entityId: 'shadow_wisp' },
      { x: 10, y: 14, entityId: 'slime' },
      { x: 14, y: 14, entityId: 'slime' },
    ],

    exits: [
      { direction: 'north', tileX: 11, tileY: 0, width: 3, targetMap: 'test_town', targetTileX: 13, targetTileY: 23 },
    ],
  };
}
