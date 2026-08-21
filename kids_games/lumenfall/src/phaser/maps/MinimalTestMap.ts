/**
 * Minimal Test Map - Single Sprite Verification
 *
 * Purpose: Verify sprite loading works with ONE clean sprite
 * No movement, no NPCs, no creatures - just test rendering
 */

import { MapData } from './MapBuilder';

export function createMinimalTestMapData(): MapData {
  return {
    id: 'minimal_test',
    name: 'Sprite Test - Single Building',
    cols: 10,
    rows: 10,
    tileSize: 64,
    bgMusic: 'none',
    ambientLight: 1.0,

    // Just green grass - no texture, just solid color
    groundLayer: [
      {
        x: 0, y: 0,
        frame: 'grass_plain',
        atlas: 'terrain_grassland',
        height: 0,
        widthTiles: 10,
        heightTiles: 10,
      },
    ],

    // ONE building - test individual sprite loading
    objectLayer: [
      {
        x: 4, y: 3,
        frame: 'house_thatch_small',
        atlas: 'buildings',  // Try atlas first
        height: 1,
        widthTiles: 2,
        heightTiles: 2,
        pixelWidth: 256,
        pixelHeight: 256,
      },
    ],

    // Structure layer - empty for minimal test
    structureLayer: [],

    // No NPCs, no creatures, no triggers
    npcs: [],
    monsters: [],
    exits: [],
  };
}
