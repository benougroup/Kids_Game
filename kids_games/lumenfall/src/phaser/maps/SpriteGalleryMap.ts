/**
 * Sprite Gallery Test Map
 *
 * Displays every sprite in a grid for inspection
 * Purpose: Identify which sprites are broken/wrong
 */

import { MapData } from './MapBuilder';

export function createSpriteGalleryMapData(): MapData {
  const objectLayer: any[] = [];

  // Buildings - row by row
  const buildings = [
    'tavern_blue_roof', 'house_thatch_small', 'house_large',
    'alchemy_shop', 'blacksmith_forge_large', 'castle_entrance',
    'chapel_large', 'market_food_building', 'inn_large',
  ];

  buildings.forEach((building, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    objectLayer.push({
      x: col * 3,
      y: row * 3,
      frame: building,
      atlas: 'buildings',
      height: 1,
      widthTiles: 2,
      heightTiles: 2,
      pixelWidth: 256,
      pixelHeight: 256,
    });
  });

  // Props - next section
  const props = [
    { frame: 'tree_oak_large', category: 'props_large', w: 128, h: 192 },
    { frame: 'tree_pine_tall', category: 'props_large', w: 128, h: 192 },
    { frame: 'barrel_pair', category: 'props_medium', w: 64, h: 64 },
    { frame: 'bush_small', category: 'props_medium', w: 64, h: 64 },
    { frame: 'well_large', category: 'props_medium', w: 64, h: 64 },
    { frame: 'campfire', category: 'props_medium', w: 64, h: 64 },
  ];

  props.forEach((prop, idx) => {
    const row = 9 + Math.floor(idx / 3);
    const col = (idx % 3) * 3;
    objectLayer.push({
      x: col,
      y: row,
      frame: prop.frame,
      atlas: prop.category,
      height: 0,
      widthTiles: 2,
      heightTiles: 2,
      pixelWidth: prop.w,
      pixelHeight: prop.h,
    });
  });

  return {
    id: 'sprite_gallery',
    name: 'Sprite Gallery - Visual Inspection',
    cols: 20,
    rows: 20,
    tileSize: 64,
    bgMusic: 'none',
    ambientLight: 1.0,

    groundLayer: [
      {
        x: 0, y: 0,
        frame: 'grass_plain',
        atlas: 'terrain_grassland',
        height: 0,
        widthTiles: 20,
        heightTiles: 20,
      },
    ],

    objectLayer,
    structureLayer: [],
    npcs: [],
    monsters: [],
    exits: [],
  };
}
