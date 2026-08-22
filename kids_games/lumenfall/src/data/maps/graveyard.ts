import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createGraveyardMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const darkGrassTerrains = [
    TERRAIN_REGISTRY.grass_dark,
    TERRAIN_REGISTRY.dirt_dark,
  ];

  for (const terrain of darkGrassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const wallTerrains = [
    TERRAIN_REGISTRY.brick_wall,
    TERRAIN_REGISTRY.dungeon_wall_grey,
  ];

  for (const terrain of wallTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const width = 22;
  const height = 15;

  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      groundLayer.push(x % darkGrassTerrains.length);
    }
  }

  const map: TileMap = {
    id: 'graveyard',
    name: 'Graveyard',
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
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'town', toX: 1, toY: Math.floor(height / 2) },
      { id: 'portal_south', type: 'door', x: Math.floor(width / 2), y: height - 1, toMapId: 'shadow_base', toX: Math.floor(width / 2), toY: 1 },
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'shrine', toX: 20, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
