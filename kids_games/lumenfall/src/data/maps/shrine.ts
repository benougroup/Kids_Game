import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createShrineMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const stoneTerrains = [
    TERRAIN_REGISTRY.dungeon_stone,
    TERRAIN_REGISTRY.grass_plain,
  ];

  for (const terrain of stoneTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 18;
  const height = 14;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < 3 || y >= height - 3) {
        groundLayer.push(0);
      } else {
        groundLayer.push(1);
      }
    }
  }

  const map: TileMap = {
    id: 'shrine',
    name: 'Shrine',
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
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'village', toX: Math.floor(width / 2), toY: 12 },
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'lake', toX: 1, toY: Math.floor(height / 2) },
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'graveyard', toX: 20, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
