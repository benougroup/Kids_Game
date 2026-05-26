/**
 * Lumenfall Village Map — Starting Map
 *
 * 32 × 26 tiles  (2048 × 1664 world pixels at 64px/tile)
 *
 * Layout design:
 *   - Full grass base with dirt-road cross (N–S cols 15–16, E–W rows 12–13)
 *   - Stone cobble plaza at the centre (cols 12–19, rows 10–15)
 *   - Dense cliff-wall border (2 tiles deep) — IMPASSABLE everywhere
 *   - 4 portal openings cut through the border, one per direction
 *   - Portal sprites (animated) placed at each opening
 *   - Buildings in the 4 quadrants
 *   - NPCs, trees, props, lamp posts, market stalls
 *
 * Portal positions (tile coords of the portal sprite):
 *   North  → col 15–16, row 0–1   (above road)
 *   South  → col 15–16, row 24–25 (below road)
 *   West   → col 0–1,   row 12–13 (left of road)
 *   East   → col 30–31, row 12–13 (right of road)
 *
 * Exit targets (placeholder — update when more maps exist):
 *   North → forest_edge  (spawn at col 15, row 24)
 *   South → dungeon_gate (spawn at col 15, row 1)
 *   West  → western_ruins (spawn at col 29, row 12)
 *   East  → market_town  (spawn at col 1, row 12)
 */

import { MapData, MapTileEntry, MapEntityEntry, MapExit } from './MapBuilder';

const TILE = 64;
const COLS = 32;
const ROWS = 26;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function fill(
  layer: MapTileEntry[],
  x: number, y: number,
  w: number, h: number,
  frame: string, atlas: string, height: number,
  opts: Partial<MapTileEntry> = {}
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      layer.push({ x: x + dx, y: y + dy, frame, atlas, height, ...opts });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP FACTORY
// ─────────────────────────────────────────────────────────────────────────────
export function createLumenfallVillageData(): MapData {
  const groundLayer: MapTileEntry[] = [];
  const objectLayer: MapTileEntry[] = [];
  const structureLayer: MapTileEntry[] = [];
  const npcs: MapEntityEntry[] = [];
  const monsters: MapEntityEntry[] = [];

  // ── 1. BASE GROUND: full grass ──────────────────────────────────────────
  fill(groundLayer, 0, 0, COLS, ROWS, 'grass_plain', 'terrain_grassland', 0);

  // Grass variety patches (decorative, still walkable)
  const grassPatches: Array<{ x: number; y: number; frame: string }> = [
    { x: 4,  y: 4,  frame: 'grass_flowers_yellow' },
    { x: 8,  y: 6,  frame: 'grass_flowers_blue' },
    { x: 6,  y: 18, frame: 'grass_dark' },
    { x: 22, y: 5,  frame: 'grass_flowers_yellow' },
    { x: 26, y: 7,  frame: 'grass_flowers_blue' },
    { x: 24, y: 19, frame: 'grass_dark' },
    { x: 5,  y: 21, frame: 'grass_dirt_patch' },
    { x: 27, y: 20, frame: 'grass_dirt_patch' },
    { x: 10, y: 20, frame: 'grass_flowers_yellow' },
    { x: 20, y: 20, frame: 'grass_flowers_blue' },
  ];
  grassPatches.forEach(p =>
    groundLayer.push({ x: p.x, y: p.y, frame: p.frame, atlas: 'terrain_grassland', height: 0 })
  );

  // ── 2. ROADS ─────────────────────────────────────────────────────────────
  // North–South road (cols 15–16, full height)
  fill(groundLayer, 15, 0, 2, ROWS, 'dirt_plain', 'terrain_grassland', 0);

  // East–West road (rows 12–13, full width)
  fill(groundLayer, 0, 12, COLS, 2, 'dirt_plain', 'terrain_grassland', 0);

  // Central plaza (cols 12–19, rows 10–15) — stone cobble
  fill(groundLayer, 12, 10, 8, 6, 'stone_plain', 'terrain_grassland', 0);

  // Cobble road widening near plaza (1 tile each side of the 2-tile road)
  // North approach
  fill(groundLayer, 14, 2, 4, 8, 'stone_cobble_02', 'terrain_grassland', 0);
  // South approach
  fill(groundLayer, 14, 16, 4, 8, 'stone_cobble_02', 'terrain_grassland', 0);
  // West approach
  fill(groundLayer, 2, 11, 10, 4, 'stone_cobble_02', 'terrain_grassland', 0);
  // East approach
  fill(groundLayer, 20, 11, 10, 4, 'stone_cobble_02', 'terrain_grassland', 0);

  // ── 3. SMALL POND (top-left quadrant) ────────────────────────────────────
  fill(groundLayer, 4, 5, 3, 3, 'water_mid', 'terrain_grassland', -2, { isWater: true, damage: 0, slowFactor: 0.5 });
  // Shore edges
  fill(groundLayer, 3, 5, 1, 3, 'water_shore', 'terrain_grassland', -2, { isWater: true });
  fill(groundLayer, 4, 4, 3, 1, 'water_shore', 'terrain_grassland', -2, { isWater: true });
  fill(groundLayer, 7, 5, 1, 3, 'water_shore', 'terrain_grassland', -2, { isWater: true });
  fill(groundLayer, 4, 8, 3, 1, 'water_shore', 'terrain_grassland', -2, { isWater: true });

  // ── 4. BORDER WALLS (2 tiles deep, impassable) ───────────────────────────
  // Top border — leave cols 15–16 open for North portal
  for (let x = 0; x < COLS; x++) {
    if (x < 15 || x > 16) {
      groundLayer.push({ x, y: 0, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: 1, frame: 'cliff_grass_green', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Bottom border — leave cols 15–16 open for South portal
  for (let x = 0; x < COLS; x++) {
    if (x < 15 || x > 16) {
      groundLayer.push({ x, y: ROWS - 2, frame: 'cliff_dirt_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x, y: ROWS - 1, frame: 'cliff_dirt_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Left border — leave rows 12–13 open for West portal
  for (let y = 2; y < ROWS - 2; y++) {
    if (y < 12 || y > 13) {
      groundLayer.push({ x: 0, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Right border — leave rows 12–13 open for East portal
  for (let y = 2; y < ROWS - 2; y++) {
    if (y < 12 || y > 13) {
      groundLayer.push({ x: COLS - 2, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
      groundLayer.push({ x: COLS - 1, y, frame: 'cliff_grey_plain', atlas: 'terrain_walls_natural', height: 3 });
    }
  }
  // Corner fills (2×2 each corner — always impassable)
  fill(groundLayer, 0, 0, 2, 2, 'cliff_grass_green', 'terrain_walls_natural', 3);
  fill(groundLayer, COLS - 2, 0, 2, 2, 'cliff_grass_green', 'terrain_walls_natural', 3);
  fill(groundLayer, 0, ROWS - 2, 2, 2, 'cliff_dirt_plain', 'terrain_walls_natural', 3);
  fill(groundLayer, COLS - 2, ROWS - 2, 2, 2, 'cliff_dirt_plain', 'terrain_walls_natural', 3);

  // ── 5. PORTAL ROAD TILES (dirt road through the border openings) ─────────
  // North portal road (cols 15–16, rows 0–1)
  fill(groundLayer, 15, 0, 2, 2, 'dirt_plain', 'terrain_grassland', 0);
  // South portal road (cols 15–16, rows 24–25)
  fill(groundLayer, 15, ROWS - 2, 2, 2, 'dirt_plain', 'terrain_grassland', 0);
  // West portal road (cols 0–1, rows 12–13)
  fill(groundLayer, 0, 12, 2, 2, 'dirt_plain', 'terrain_grassland', 0);
  // East portal road (cols 30–31, rows 12–13)
  fill(groundLayer, COLS - 2, 12, 2, 2, 'dirt_plain', 'terrain_grassland', 0);

  // ── 6. TREES ─────────────────────────────────────────────────────────────
  // Top-left quadrant trees (away from pond and road)
  const treesNW = [
    { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 },
    { x: 6, y: 3 }, { x: 3, y: 6 },
  ];
  treesNW.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_oak_large', atlas: 'objects_props_v002', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 170, collisionW: 1, collisionH: 1 })
  );

  // Top-right quadrant trees
  const treesNE = [
    { x: 22, y: 3 }, { x: 25, y: 3 }, { x: 28, y: 3 },
    { x: 22, y: 7 }, { x: 28, y: 7 }, { x: 25, y: 8 },
  ];
  treesNE.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_pine_tall', atlas: 'objects_props_v002', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 170, collisionW: 1, collisionH: 1 })
  );

  // Bottom-left quadrant trees
  const treesSW = [
    { x: 3, y: 17 }, { x: 6, y: 17 }, { x: 9, y: 17 },
    { x: 3, y: 21 }, { x: 8, y: 22 },
  ];
  treesSW.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_oak_large', atlas: 'objects_props_v002', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 170, collisionW: 1, collisionH: 1 })
  );

  // Bottom-right quadrant trees
  const treesSE = [
    { x: 22, y: 17 }, { x: 25, y: 17 }, { x: 28, y: 17 },
    { x: 22, y: 21 }, { x: 27, y: 22 },
  ];
  treesSE.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'tree_pine_tall', atlas: 'objects_props_v002', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 170, collisionW: 1, collisionH: 1 })
  );

  // ── 7. OBJECTS & PROPS ───────────────────────────────────────────────────
  // Fountain at plaza centre
  objectLayer.push({ x: 14, y: 11, frame: 'fountain_round', atlas: 'objects_props_v003', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 160, yOffset: -64 });

  // Well (west of plaza)
  objectLayer.push({ x: 10, y: 12, frame: 'well_large', atlas: 'objects_props_v002', height: 2, widthTiles: 3, heightTiles: 3, pixelWidth: 192, pixelHeight: 170, collisionW: 1, collisionH: 1 });

  // Lamp posts along main roads
  const lampPosts = [
    { x: 13, y: 5 }, { x: 18, y: 5 },   // North road flanks
    { x: 13, y: 20 }, { x: 18, y: 20 },  // South road flanks
    { x: 5,  y: 11 }, { x: 5,  y: 14 },  // West road flanks
    { x: 26, y: 11 }, { x: 26, y: 14 },  // East road flanks
  ];
  // Lamp posts: 192x170 native → display at 64x114 (1 tile wide, 1.75 tiles tall)
  lampPosts.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'lamp_post', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 2, pixelWidth: 64, pixelHeight: 114, collisionW: 1, collisionH: 1 })
  );

  // Barrels near blacksmith (192x170 native → display at 96x85 = 1.5 tiles)
  objectLayer.push({ x: 9, y: 7, frame: 'barrel_pair', atlas: 'objects_props_v002', height: 1, widthTiles: 2, heightTiles: 2, pixelWidth: 96, pixelHeight: 85, collisionW: 1, collisionH: 1 });
  objectLayer.push({ x: 11, y: 7, frame: 'barrel_triple', atlas: 'objects_props_v002', height: 1, widthTiles: 2, heightTiles: 2, pixelWidth: 96, pixelHeight: 85, collisionW: 1, collisionH: 1 });

  // Market stalls: 192x170 native → display at 128x114 (2 tiles wide)
  objectLayer.push({ x: 20, y: 10, frame: 'market_stall_food', atlas: 'objects_props_v002', height: 2, widthTiles: 2, heightTiles: 2, pixelWidth: 128, pixelHeight: 114, collisionW: 2, collisionH: 1 });
  objectLayer.push({ x: 20, y: 14, frame: 'market_stall_goods', atlas: 'objects_props_v002', height: 2, widthTiles: 2, heightTiles: 2, pixelWidth: 128, pixelHeight: 114, collisionW: 2, collisionH: 1 });

  // Bushes (192x170 native → display at 64x57 = 1 tile)
  const bushes = [
    { x: 11, y: 9 }, { x: 20, y: 9 }, { x: 11, y: 16 }, { x: 20, y: 16 },
    { x: 7, y: 14 }, { x: 24, y: 14 },
  ];
  bushes.forEach(p =>
    objectLayer.push({ x: p.x, y: p.y, frame: 'bush_small', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 })
  );

  // Campfire near inn (192x170 native → display at 64x57 = 1 tile, no collision)
  objectLayer.push({ x: 9, y: 5, frame: 'campfire', atlas: 'objects_props_v002', height: 0, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57, collisionW: 0, collisionH: 0 });

  // Graveyard (bottom-left corner) — 192x170 → 64x57 per stone
  objectLayer.push({ x: 4, y: 20, frame: 'gravestone_cross', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });
  objectLayer.push({ x: 6, y: 20, frame: 'gravestone_plain', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });
  objectLayer.push({ x: 5, y: 22, frame: 'gravestone_rounded', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });

  // Ruins arch (bottom-right corner)
  objectLayer.push({ x: 26, y: 20, frame: 'ruin_arch_stone', atlas: 'objects_props_v003', height: 2, widthTiles: 2, heightTiles: 2 });

  // Signs at road junctions (192x170 → 64x57)
  objectLayer.push({ x: 14, y: 9, frame: 'sign_forest', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });
  objectLayer.push({ x: 17, y: 9, frame: 'sign_village', atlas: 'objects_props_v002', height: 1, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });

  // Fence posts flanking north gate (cols 13 and 18, rows 7–8)
  [7, 8].forEach(row => {
    objectLayer.push({ x: 13, y: row, frame: 'fence_short', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });
    objectLayer.push({ x: 18, y: row, frame: 'fence_short', atlas: 'objects_props_v002', height: 2, widthTiles: 1, heightTiles: 1, pixelWidth: 64, pixelHeight: 57 });
  });

  // Statue in plaza
  objectLayer.push({ x: 17, y: 11, frame: 'statue_knight', atlas: 'objects_props_v003', height: 2, widthTiles: 1, heightTiles: 2, pixelWidth: 64, pixelHeight: 128 });

  // ── 8. BUILDINGS ─────────────────────────────────────────────────────────
  // All buildings are 384x256px in the atlas.
  // Display at pixelWidth:192, pixelHeight:128 (3:2 ratio preserved, 3x2 tiles).
  // collisionW:3, collisionH:2 blocks the full footprint.
  const BLDG = { widthTiles: 3, heightTiles: 2, pixelWidth: 192, pixelHeight: 128, collisionW: 3, collisionH: 2 };

  // NW quadrant: Inn (top-left)
  structureLayer.push({ x: 4, y: 3, frame: 'tavern_blue_roof', atlas: 'buildings_v003', height: 3, ...BLDG });

  // NE quadrant: Blacksmith (top-right)
  structureLayer.push({ x: 23, y: 3, frame: 'blacksmith_forge_large', atlas: 'buildings_v003', height: 3, ...BLDG });

  // SW quadrant: Chapel (bottom-left)
  structureLayer.push({ x: 4, y: 18, frame: 'chapel_large', atlas: 'buildings_v003', height: 3, ...BLDG });

  // SE quadrant: Alchemy Shop (bottom-right)
  structureLayer.push({ x: 23, y: 18, frame: 'alchemy_shop', atlas: 'buildings_v003', height: 3, ...BLDG });

  // W side: Market building
  structureLayer.push({ x: 4, y: 12, frame: 'market_food_building', atlas: 'buildings_v003', height: 3, ...BLDG });

  // E side: Magic shop
  structureLayer.push({ x: 24, y: 12, frame: 'magic_shop_crystal', atlas: 'buildings_v003', height: 3, ...BLDG });

  // Watchtowers flanking north gate (yOffset shifts sprite up so full tower is visible)
  structureLayer.push({ x: 11, y: 8, frame: 'watchtower_small', atlas: 'buildings_v003', height: 3, ...BLDG, yOffset: -64 });
  structureLayer.push({ x: 18, y: 8, frame: 'watchtower_small', atlas: 'buildings_v003', height: 3, ...BLDG, yOffset: -64 });

  // ── 9. NPCs ───────────────────────────────────────────────────────────────
  npcs.push({ x: 13, y: 6,  entityId: 'guard'      });  // Guard at north gate (left)
  npcs.push({ x: 18, y: 6,  entityId: 'guard2'     });  // Guard at north gate (right)
  npcs.push({ x: 15, y: 14, entityId: 'apprentice' });  // Apprentice near plaza
  npcs.push({ x: 21, y: 11, entityId: 'merchant'   });  // Merchant at east stall
  npcs.push({ x: 5,  y: 13, entityId: 'elder'      });  // Elder near market
  npcs.push({ x: 24, y: 4,  entityId: 'blacksmith' });  // Blacksmith at forge
  npcs.push({ x: 4,  y: 13, entityId: 'innkeeper'  });  // Innkeeper
  npcs.push({ x: 24, y: 13, entityId: 'scholar'    });  // Scholar at magic shop
  npcs.push({ x: 11, y: 13, entityId: 'child'      });  // Child wandering

  // ── 10. EXITS (portal-only travel) ───────────────────────────────────────
  // The exit tiles are at the portal openings in the border.
  // Players can ONLY leave through these 4 portals — the rest of the border is impassable.
  const exits: MapExit[] = [
    {
      direction: 'north',
      tileX: 15, tileY: 0,
      width: 2,
      targetMap: 'test_forest',
      targetTileX: 15, targetTileY: ROWS - 2,
    },
    {
      direction: 'south',
      tileX: 15, tileY: ROWS - 1,
      width: 2,
      targetMap: 'test_dungeon',
      targetTileX: 12, targetTileY: 3,  // Spawn at row 3, safely away from north border+exit
    },
    {
      direction: 'west',
      tileX: 0, tileY: 12,
      width: 2,
      targetMap: 'test_town',
      targetTileX: COLS - 3, targetTileY: 12,
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
    id: 'lumenfall_village',
    name: 'Lumenfall Village',
    cols: COLS,
    rows: ROWS,
    tileSize: TILE,
    ambientLight: 0.9,
    groundLayer,
    objectLayer,
    structureLayer,
    npcs,
    monsters,
    exits,
  };
}
