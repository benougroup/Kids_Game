# Lumenfall Sprite Generation Manifest

This manifest is derived from the current repository specifications and is the complete generation list. Every entry must be produced as **one standalone RGBA PNG**, in **16–32-bit retro pixel-art style**, with a **fully transparent background**, **clean alpha edge**, **no black box**, **no colored outline or fringe**, and the **exact stated canvas**. There are no animation sheets.

| # | Deliverable Filename | Runtime Destination | Exact Canvas | Required Subject / Pose |
|---:|---|---|---|---|
| 1 | `BUILDINGS_tavern_blue_roof.png` | `assets/sprites/buildings/tavern_blue_roof.png` | 256×256 | Welcoming tavern, blue tiled roof, chimney, lit windows, bottom-center door. |
| 2 | `BUILDINGS_house_thatch_small.png` | `assets/sprites/buildings/house_thatch_small.png` | 256×256 | Small cozy cottage, golden thatch, cream walls, round door, flower pots. |
| 3 | `BUILDINGS_house_large.png` | `assets/sprites/buildings/house_large.png` | 256×256 | Lived-in two-story house, tiled roof, shutters, multiple windows. |
| 4 | `BUILDINGS_alchemy_shop.png` | `assets/sprites/buildings/alchemy_shop.png` | 256×256 | Safe mystical shop, potion bottles, purple/green magic, arched door. |
| 5 | `BUILDINGS_blacksmith_forge_large.png` | `assets/sprites/buildings/blacksmith_forge_large.png` | 256×256 | Large forge, weathered stone, double doors, smoke, orange forge glow. |
| 6 | `BUILDINGS_castle_entrance.png` | `assets/sprites/buildings/castle_entrance.png` | 256×256 | Stone gate, battlements, wooden gate, side turrets and banners. |
| 7 | `BUILDINGS_chapel_large.png` | `assets/sprites/buildings/chapel_large.png` | 256×256 | Peaceful chapel, cross, stained glass, small bell tower. |
| 8 | `BUILDINGS_market_food_building.png` | `assets/sprites/buildings/market_food_building.png` | 256×256 | Food stall/building, bright produce and herbs, open friendly frontage. |
| 9 | `BUILDINGS_inn_large.png` | `assets/sprites/buildings/inn_large.png` | 256×256 | Large warm multi-story inn, at least three lit windows and inn sign. |
| 10 | `CREATURES_rabbit_idle.png` | `assets/sprites/creatures/animals_peaceful/rabbit/idle.png` | 32×32 | Cute natural rabbit, calm sitting/alert idle, facing front-right. |
| 11 | `CREATURES_rabbit_walk.png` | `assets/sprites/creatures/animals_peaceful/rabbit/walk.png` | 32×32 | Same rabbit, mid-hop walking pose with extended back legs. |
| 12 | `CREATURES_squirrel_idle.png` | `assets/sprites/creatures/animals_peaceful/squirrel/idle.png` | 28×28 | Reddish-brown squirrel, seated and alert, fluffy curved tail. |
| 13 | `CREATURES_bird_idle.png` | `assets/sprites/creatures/animals_peaceful/bird/idle.png` | 24×24 | Cheerful robin-like bird, perched/hovering, wings folded. |
| 14 | `CREATURES_bird_fly.png` | `assets/sprites/creatures/animals_peaceful/bird/fly.png` | 24×28 | Same robin-like bird, wings spread and flying upward. |
| 15 | `CREATURES_frog_idle.png` | `assets/sprites/creatures/animals_peaceful/frog/idle.png` | 20×20 | Cute green frog, forward-facing squat idle pose. |
| 16 | `CREATURES_wolf_idle.png` | `assets/sprites/creatures/animals_aggressive/wolf/idle.png` | 42×42 | Alert natural wolf, four-legged stance, child-safe mild snarl. |
| 17 | `CREATURES_slime_idle.png` | `assets/sprites/creatures/monsters/slime/idle.png` | 32×32 | Goofy non-threatening jelly slime, bouncy and translucent. |
| 18 | `CREATURES_spider_idle.png` | `assets/sprites/creatures/monsters/spider/idle.png` | 36×36 | Eight-legged brown/black spider, mildly spooky but cute. |
| 19 | `CREATURES_skeleton_idle.png` | `assets/sprites/creatures/undead/skeleton/idle.png` | 44×44 | Silly upright skeleton warrior, optional small weapon, non-terrifying. |
| 20 | `CREATURES_ghost_idle.png` | `assets/sprites/creatures/undead/ghost/idle.png` | 40×40 | Friendly pale ghost, rounded sheet body and wispy lower edge. |
| 21 | `PROPS_tree_oak_large.png` | `assets/sprites/props_large/tree_oak_large.png` | 128×192 | Majestic oak, full leafy crown, thick trunk, roots at bottom. |
| 22 | `PROPS_tree_pine_tall.png` | `assets/sprites/props_large/tree_pine_tall.png` | 128×192 | Tall narrow pine, conical dark-green branches, visible trunk. |
| 23 | `PROPS_barrel_pair.png` | `assets/sprites/props_medium/barrel_pair.png` | 64×64 | Two upright weathered wooden barrels, metal bands. |
| 24 | `PROPS_bush_small.png` | `assets/sprites/props_medium/bush_small.png` | 64×64 | Small leafy decorative bush, optional subtle flowers/berries. |
| 25 | `PROPS_well_large.png` | `assets/sprites/props_medium/well_large.png` | 64×64 | Medieval stone well, circular opening, wooden frame/roof and rope. |
| 26 | `PROPS_campfire.png` | `assets/sprites/props_medium/campfire.png` | 64×64 | Cozy stone-ring campfire, arranged logs, warm flame and subtle embers. |
| 27 | `NPCS_guard_aldric.png` | `assets/sprites/characters/guard_aldric.png` | 48×48 | Friendly authoritative adult male guard, armor, upright front-facing stance. |
| 28 | `NPCS_mira_apprentice.png` | `assets/sprites/characters/mira_apprentice.png` | 48×48 | Friendly young woman apprentice, blue/purple clothes, subtle magical accent. |
| 29 | `NPCS_scholar_vera.png` | `assets/sprites/characters/scholar_vera.png` | 48×48 | Elderly wise woman scholar, earth-tone robes, kind dignified pose. |

## Batch Acceptance Rules

Each PNG must be checked at its final target canvas size. A file is rejected if it has opaque background pixels outside the subject; any black, white, magenta, cyan, or other artificial border; text; a guide line; more than one intended subject; or an incorrect filename/dimension. Buildings and trees must be vertically anchored toward the bottom of their canvases. Creature and NPC poses must follow the state specified in the filename.

## Naming Resolution

The specification's plural filenames above are the delivery names. The relevant runtime loaders resolve the same asset basenames from the destination paths shown in the table. The output package will retain the delivery names at its root and use the runtime folder structure for Claude integration.
