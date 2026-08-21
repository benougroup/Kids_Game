/**
 * Tutorial Village - First Scenario
 *
 * A safe, friendly village where the player learns:
 * - How to move and explore
 * - How to talk to NPCs
 * - How to make dialogue choices
 * - Basic game mechanics
 *
 * Features:
 * - 3 NPCs with greeting dialogue
 * - Simple village layout
 * - Peaceful animals (no threats)
 * - Exit to Forest for next scenario
 */

import { MapData } from './MapBuilder';

export function createTutorialVillageData(): MapData {
  return {
    id: 'tutorial_village',
    name: 'Welcome to Lumenfall Village',
    cols: 20,
    rows: 15,
    tileSize: 64,
    bgMusic: 'village_peaceful',
    ambientLight: 0.85,  // Bright, welcoming daytime

    // Ground layer - grass and dirt tiles filling entire map
    groundLayer: [
      // Fill entire ground with grass
      {
        x: 0, y: 0,
        frame: 'grass_plain',
        atlas: 'terrain_grassland',
        height: 0,
        widthTiles: 20,
        heightTiles: 15,
        pixelWidth: 1280,
        pixelHeight: 960,
      },
      // Dirt path leading to buildings (North-South)
      {
        x: 9, y: 0,
        frame: 'dirt_light',
        atlas: 'terrain_grassland',
        height: 0,
        widthTiles: 2,
        heightTiles: 15,
        pixelWidth: 128,
        pixelHeight: 960,
      },
      // Dirt path leading to buildings (East-West)
      {
        x: 0, y: 7,
        frame: 'dirt_light',
        atlas: 'terrain_grassland',
        height: 0,
        widthTiles: 20,
        heightTiles: 2,
        pixelWidth: 1280,
        pixelHeight: 128,
      },
    ],

    // Object layer - trees, rocks, decorative props
    objectLayer: [
      // Left side trees (provide framing) - 128x192 large props
      {
        x: 1, y: 2,
        frame: 'tree_oak_large',
        atlas: 'N/A',  // Will use individual sprite
        height: 0,
        widthTiles: 2,
        heightTiles: 2,
        pixelWidth: 128,
        pixelHeight: 192,
      },
      // Right side trees - 128x192 large props
      {
        x: 17, y: 3,
        frame: 'tree_pine_tall',
        atlas: 'N/A',  // Will use individual sprite
        height: 0,
        widthTiles: 2,
        heightTiles: 2,
        pixelWidth: 128,
        pixelHeight: 192,
      },
      // Small decorative bushes - 64x64 medium props
      {
        x: 3, y: 11,
        frame: 'bush_small',
        atlas: 'N/A',  // Will use individual sprite
        height: 0,
        widthTiles: 1,
        heightTiles: 1,
        pixelWidth: 64,
        pixelHeight: 64,
      },
      {
        x: 16, y: 12,
        frame: 'bush_small',
        atlas: 'N/A',  // Will use individual sprite
        height: 0,
        widthTiles: 1,
        heightTiles: 1,
        pixelWidth: 64,
        pixelHeight: 64,
      },
      // Barrels near buildings (storage theme) - 64x64 medium props
      {
        x: 5, y: 8,
        frame: 'barrel_pair',
        atlas: 'N/A',  // Will use individual sprite
        height: 0,
        widthTiles: 1,
        heightTiles: 1,
        pixelWidth: 64,
        pixelHeight: 64,
      },
    ],

    // Structure layer - buildings where NPCs are located
    structureLayer: [
      // Central Tavern (main gathering place) - 256x256 building
      {
        x: 8, y: 5,
        frame: 'tavern_blue_roof',
        atlas: 'N/A',
        height: 1,
        widthTiles: 3,
        heightTiles: 3,
        pixelWidth: 256,
        pixelHeight: 256,
        yOffset: 0,
      },
      // Left house (Guard's post) - 256x256 building
      {
        x: 2, y: 9,
        frame: 'house_thatch_small',
        atlas: 'N/A',
        height: 1,
        widthTiles: 2,
        heightTiles: 2,
        pixelWidth: 256,
        pixelHeight: 256,
        yOffset: 0,
      },
      // Right house (Apprentice's home) - 256x256 building
      {
        x: 15, y: 10,
        frame: 'house_large',
        atlas: 'N/A',
        height: 1,
        widthTiles: 2,
        heightTiles: 2,
        pixelWidth: 256,
        pixelHeight: 256,
        yOffset: 0,
      },
    ],

    // NPCs - Main characters to talk to
    npcs: [
      {
        x: 9,
        y: 6,
        entityId: 'guard',
        name: 'Guard Aldric',
        dialogueKey: 'tutorial_guard_aldric',
      },
      {
        x: 3,
        y: 10,
        entityId: 'apprentice',
        name: 'Mira the Apprentice',
        dialogueKey: 'tutorial_apprentice_mira',
      },
      {
        x: 16,
        y: 11,
        entityId: 'scholar',
        name: 'Scholar Vera',
        dialogueKey: 'tutorial_scholar_vera',
      },
    ],

    // Peaceful animals - wander around, flee when approached
    // NOTE: Using only rabbits which have stable sprite files
    // Other creatures have rendering issues that will be fixed separately
    monsters: [
      // Rabbits scattered around - these work reliably
      { x: 2, y: 2, entityId: 'rabbit' },
      { x: 17, y: 1, entityId: 'rabbit' },
      { x: 5, y: 12, entityId: 'rabbit' },
      { x: 14, y: 10, entityId: 'rabbit' },
      { x: 8, y: 2, entityId: 'rabbit' },
      { x: 11, y: 13, entityId: 'rabbit' },
    ],

    // Exits - Path to next scenario
    exits: [
      {
        direction: 'north',
        tileX: 9,
        tileY: 0,
        width: 2,
        targetMap: 'forest_exploration',
        targetTileX: 10,
        targetTileY: 14,
      },
    ],
  };
}
