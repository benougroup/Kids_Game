import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createShadowBaseMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const dungeonTerrains = [
    TERRAIN_REGISTRY.dungeon_floor,
    TERRAIN_REGISTRY.dungeon_dirt,
  ];

  for (const terrain of dungeonTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const wallTerrains = [
    TERRAIN_REGISTRY.dungeon_wall,
    TERRAIN_REGISTRY.dungeon_wall_moss,
  ];

  for (const terrain of wallTerrains) {
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
      groundLayer.push(y % dungeonTerrains.length);
    }
  }

  const map: TileMap = {
    id: 'shadow_base',
    name: 'Shadow Monster Base',
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
      { id: 'portal_north', type: 'door', x: Math.floor(width / 2), y: 0, toMapId: 'graveyard', toX: Math.floor(width / 2), toY: 13 },
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'river', toX: 1, toY: Math.floor(height / 2) },
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'forest_north', toX: 18, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
