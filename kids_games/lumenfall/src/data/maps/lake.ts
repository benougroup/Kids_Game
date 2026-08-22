import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createLakeMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const sandTerrains = [
    TERRAIN_REGISTRY.sand_plain,
    TERRAIN_REGISTRY.sand_dunes,
  ];

  for (const terrain of sandTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const waterTerrains = [
    TERRAIN_REGISTRY.water_light,
    TERRAIN_REGISTRY.water_ripple,
  ];

  for (const terrain of waterTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 20;
  const height = 14;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y >= 10) {
        groundLayer.push((x % sandTerrains.length) + 2);
      } else {
        groundLayer.push(x % sandTerrains.length);
      }
    }
  }

  const map: TileMap = {
    id: 'lake',
    name: 'Lake',
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
    objects: [],
    interactables: [
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'shrine', toX: 16, toY: Math.floor(height / 2) },
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'village', toX: Math.floor(width / 2), toY: 12 },
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'forest_north', toX: 1, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
