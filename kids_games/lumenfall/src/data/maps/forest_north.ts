import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createForestNorthMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const grassTerrains = [
    TERRAIN_REGISTRY.grass_plain,
    TERRAIN_REGISTRY.grass_flowers_blue,
  ];

  for (const terrain of grassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 22;
  const height = 16;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      groundLayer.push((x + y) % grassTerrains.length);
    }
  }

  const map: TileMap = {
    id: 'forest_north',
    name: 'North Forest',
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
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'town', toX: Math.floor(width / 2), toY: 14 },
      { id: 'portal_south', type: 'door', x: Math.floor(width / 2), y: height - 1, toMapId: 'forest_south', toX: Math.floor(width / 2), toY: 1 },
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'river', toX: 1, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
