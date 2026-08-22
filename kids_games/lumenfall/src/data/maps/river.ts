import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createRiverMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const waterTerrains = [
    TERRAIN_REGISTRY.water_light,
    TERRAIN_REGISTRY.water_ripple,
    TERRAIN_REGISTRY.water_shore,
  ];

  for (const terrain of waterTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const grassTerrains = [
    TERRAIN_REGISTRY.grass_plain,
  ];

  for (const terrain of grassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 18;
  const height = 16;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= 6 && x <= 12) {
        groundLayer.push(y % waterTerrains.length);
      } else {
        groundLayer.push(3);
      }
    }
  }

  const map: TileMap = {
    id: 'river',
    name: 'River',
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
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'forest_north', toX: 20, toY: Math.floor(height / 2) },
      { id: 'portal_south', type: 'door', x: Math.floor(width / 2), y: height - 1, toMapId: 'shadow_base', toX: Math.floor(width / 2), toY: 1 },
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'forest_south', toX: Math.floor(width / 2), toY: 14 },
    ],
    triggers: [],
  };

  return map;
}
