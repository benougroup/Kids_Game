import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createForestSouthMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const grassTerrains = [
    TERRAIN_REGISTRY.grass_plain,
    TERRAIN_REGISTRY.grass_dark,
  ];

  for (const terrain of grassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 24;
  const height = 16;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      groundLayer.push((x * y) % grassTerrains.length);
    }
  }

  const map: TileMap = {
    id: 'forest_south',
    name: 'South Forest',
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
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'forest_north', toX: Math.floor(width / 2), toY: 14 },
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'river', toX: 1, toY: Math.floor(height / 2) },
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'shadow_base', toX: 18, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
