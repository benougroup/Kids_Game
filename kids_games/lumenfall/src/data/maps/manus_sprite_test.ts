/**
 * Test Map - Manus Sprite Integration
 *
 * Tests:
 * - Terrain types from TerrainRegistry
 * - Building sprites from Manus AI
 * - Creature sprites from Manus AI
 * - Prop sprites from Manus AI
 * - NPC sprites from Manus AI
 */

import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createManusSpriteTestMap(): TileMap {
  // Build terrain metadata from registry
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  // Grass variations (IDs 0-3)
  const grassTerrains = [
    TERRAIN_REGISTRY.grass_plain,
    TERRAIN_REGISTRY.grass_flowers_blue,
    TERRAIN_REGISTRY.grass_flowers_yellow,
    TERRAIN_REGISTRY.grass_dark,
  ];

  for (const terrain of grassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  // Water variations (IDs 4-7)
  const waterTerrains = [
    TERRAIN_REGISTRY.water_light,
    TERRAIN_REGISTRY.water_ripple,
    TERRAIN_REGISTRY.water_shore,
    TERRAIN_REGISTRY.water_deep,
  ];

  for (const terrain of waterTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  // Sand variations (IDs 8-10)
  const sandTerrains = [
    TERRAIN_REGISTRY.sand_plain,
    TERRAIN_REGISTRY.sand_dunes,
    TERRAIN_REGISTRY.sand_dry,
  ];

  for (const terrain of sandTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  // Create ground layer: grass base with water in middle, sand on right
  const groundLayer: number[] = [];
  const width = 20;
  const height = 12;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < 6) {
        // Left side: grass
        groundLayer.push(x % grassTerrains.length);
      } else if (x < 14) {
        // Middle: water
        groundLayer.push(4 + (y % waterTerrains.length));
      } else {
        // Right: sand
        groundLayer.push(8 + (x % sandTerrains.length));
      }
    }
  }

  const map: TileMap = {
    id: 'manus_sprite_test',
    name: 'Manus Sprite Test Map',
    tileSize: 32,
    width,
    height,

    layers: {
      ground: groundLayer,
      decor: new Array(width * height).fill(0),
      collision: new Array(width * height).fill(0),
      overlay: new Array(width * height).fill(0),
    },

    tilePalette,
    terrainMetaByTileId,

    // Objects: buildings, props, creatures, NPCs from Manus
    objects: [
      // Tavern - building
      {
        id: 'tavern_01',
        objectType: 'building',
        assetId: 'BUILDINGS_tavern_blue_roof',
        x: 2,
        y: 3,
        wTiles: 4,
        hTiles: 4,
        collision: true,
        terrainLevel: 2,
        zOrder: 10,
      },
      // House - building
      {
        id: 'house_01',
        objectType: 'building',
        assetId: 'BUILDINGS_house_thatch_small',
        x: 8,
        y: 2,
        wTiles: 3,
        hTiles: 3,
        collision: true,
        terrainLevel: 2,
        zOrder: 10,
      },
      // Castle entrance - building
      {
        id: 'castle_01',
        objectType: 'building',
        assetId: 'BUILDINGS_castle_entrance',
        x: 15,
        y: 3,
        wTiles: 4,
        hTiles: 4,
        collision: true,
        terrainLevel: 2,
        zOrder: 10,
      },
      // Tree - prop
      {
        id: 'tree_oak_01',
        objectType: 'tree',
        assetId: 'PROPS_tree_oak_large',
        x: 4,
        y: 8,
        wTiles: 2,
        hTiles: 3,
        collision: true,
        terrainLevel: 1,
        zOrder: 8,
      },
      // Pine tree - prop
      {
        id: 'tree_pine_01',
        objectType: 'tree',
        assetId: 'PROPS_tree_pine_tall',
        x: 10,
        y: 7,
        wTiles: 2,
        hTiles: 3,
        collision: true,
        terrainLevel: 1,
        zOrder: 8,
      },
      // Barrel - prop
      {
        id: 'barrels_01',
        objectType: 'prop',
        assetId: 'PROPS_barrel_pair',
        x: 3,
        y: 1,
        wTiles: 1,
        hTiles: 1,
        collision: true,
        terrainLevel: 0,
        zOrder: 5,
      },
      // Well - prop
      {
        id: 'well_01',
        objectType: 'prop',
        assetId: 'PROPS_well_large',
        x: 17,
        y: 8,
        wTiles: 1,
        hTiles: 1,
        collision: true,
        terrainLevel: 0,
        zOrder: 5,
      },
      // Campfire - prop
      {
        id: 'campfire_01',
        objectType: 'prop',
        assetId: 'PROPS_campfire',
        x: 1,
        y: 10,
        wTiles: 1,
        hTiles: 1,
        collision: false,
        terrainLevel: 0,
        zOrder: 4,
      },
    ],

    // NPCs from Manus
    npcs: [
      {
        id: 'guard_aldric',
        name: 'Guard Aldric',
        mapId: 'manus_sprite_test',
        x: 2,
        y: 2,
        spriteId: 'NPCS_guard_aldric',
        collision: true,
        facing: 'down',
        interaction: {
          storyId: 'demo',
          defaultSceneId: 'greeting',
        },
      },
      {
        id: 'mira_apprentice',
        name: 'Mira',
        mapId: 'manus_sprite_test',
        x: 9,
        y: 1,
        spriteId: 'NPCS_mira_apprentice',
        collision: true,
        facing: 'down',
        interaction: {
          storyId: 'demo',
          defaultSceneId: 'greeting',
        },
      },
      {
        id: 'scholar_vera',
        name: 'Scholar Vera',
        mapId: 'manus_sprite_test',
        x: 17,
        y: 7,
        spriteId: 'NPCS_scholar_vera',
        collision: true,
        facing: 'left',
        interaction: {
          storyId: 'demo',
          defaultSceneId: 'greeting',
        },
      },
    ],

    interactables: [],
    triggers: [],
  };

  return map;
}
