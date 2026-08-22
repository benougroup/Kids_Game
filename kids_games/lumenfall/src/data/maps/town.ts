import type { TileMap, TerrainTileMetadata } from '../../systems/MapSystem';
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createTownMap(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  const grassTerrains = [
    TERRAIN_REGISTRY.grass_plain,
    TERRAIN_REGISTRY.grass_flowers_blue,
    TERRAIN_REGISTRY.grass_flowers_yellow,
    TERRAIN_REGISTRY.grass_dark,
  ];

  for (const terrain of grassTerrains) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  const wallTerrains = [
    TERRAIN_REGISTRY.brick_wall,
    TERRAIN_REGISTRY.dungeon_wall,
  ];

  for (const terrain of wallTerrains) {
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
      if ((x < 2 || x >= width - 2) && (y < 2 || y >= height - 2)) {
        groundLayer.push(4);
      } else {
        groundLayer.push(x % grassTerrains.length);
      }
    }
  }

  const map: TileMap = {
    id: 'town',
    name: 'Town',
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
      { id: 'portal_east', type: 'door', x: width - 1, y: Math.floor(height / 2), toMapId: 'village', toX: 1, toY: Math.floor(height / 2) },
      { id: 'portal_south', type: 'door', x: Math.floor(width / 2), y: height - 1, toMapId: 'forest_north', toX: Math.floor(width / 2), toY: 1 },
      { id: 'portal_west', type: 'door', x: 0, y: Math.floor(height / 2), toMapId: 'graveyard', toX: 22, toY: Math.floor(height / 2) },
    ],
    triggers: [],
  };

  return map;
}
