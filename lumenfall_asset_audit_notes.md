# Lumenfall Asset Audit Notes

## Reviewed sprite sheets

| File | Dimensions | Observed contents | Key issues |
|---|---:|---|---|
| `buildings_v003.png` | 1536 x 1024 | Large buildings: taverns, shops, blacksmith, watchtower, chapel, magic shop, castle gate, ruins, dock, windmill | Mixed building footprints and perspective scale; likely duplicate/misaligned frame definitions in JSON |
| `objects_props_v002.png` | 1536 x 1024 | Trees, rocks, barrels, hay, crates, sacks, fences, signs, lamps, wells, carts, gravestones, tables, shelves, market stalls | Contains multiple unrelated prop classes in one sheet; object sizes visually inconsistent |
| `objects_props_v003.png` | 1536 x 1024 | Ruins, statues, fountain, tents, gate, books, campfire, cauldron, columns, banners, shrine/tree ruins | Mixed category sheet; likely inconsistent cut boxes and inconsistent scale |
| `terrain_grassland.png` | 548 x 548 | Ground tiles, dirt, stone, sand, water, lava, dungeon-like inserts | Appears to mix terrain families into one sheet |
| `terrain_walls_natural.png` | 412 x 344 | Cliff / wall variants in multiple materials | Natural wall set appears tile-based and more regular than prop/building sheets |

## Important visual findings

1. The current asset organization mixes **many unrelated object categories** into the same files.
2. Buildings and props appear to be cut by convenience-grid rather than by a documented per-object bounding rule.
3. Building and prop sizes appear visually inconsistent relative to the game perspective.
4. `buildings_v003.json` has a known duplicate-frame problem: `house_blue_roof_large` and `magic_shop_crystal` share the same coordinates.
5. The user wants the pipeline redesigned around:
   - category-based files
   - perspective/scale rules
   - per-file definitions/specifications
   - correctly re-cut individual objects

## Proposed category direction from current observations

| Proposed category | Likely current sources |
|---|---|
| Terrain ground tiles | `terrain_grassland.png`, `tiles*.png`, `roads_new.png` |
| Natural walls / cliffs | `terrain_walls_natural.png` |
| Manmade walls / masonry | `terrain_walls_manmade.png` |
| Buildings - homes / village | `buildings_v002.png`, `buildings_v003.png` |
| Buildings - civic / religious / special | `buildings_v003.png` |
| Trees / vegetation | `objects_props_v002.png`, `objects_props_v003.png` |
| Storage / utility props | `objects_props_v002.png`, `objects_props_v003.png` |
| Ruins / statues / monuments | `objects_props_v003.png` |
| Market / furniture / camp props | `objects_props_v002.png`, `objects_props_v003.png` |

## Next audit steps

1. Read all atlas JSON files and extract every frame name and bounding box.
2. Compare sheet contents with JSON definitions.
3. Build a master catalog of object name -> source sheet -> current frame box -> proposed category.
4. Define normalized scale rules by category before re-cutting.
