# Lumenfall Master Asset Catalog

This document is the comprehensive inventory of all visual assets required for Lumenfall. It expands upon the original Asset Pipeline Spec by listing every specific item, structure, character, and environment piece needed for the game, along with their exact generation parameters.

---

## 1. Asset Generation Parameters

When generating these assets, use the following base prompt template, adjusting the bracketed fields based on the category:

> Create a single **[OBJECT NAME]** for a 2D top-down RPG game. 
> Style: high-quality digital illustration, rich detail, warm lighting, painterly but clean (not strict pixel art, but scales well). 
> Perspective: 3/4 top-down view (camera looks down at ~45 degrees). 
> Canvas size: **[W × H] pixels**, transparent background (RGBA PNG). 
> The object should fill ~80% of the canvas, centered horizontally, aligned to the bottom. 
> Lighting: soft overhead light, slight warm glow, shadows fall straight down. No cast shadows outside the object's own footprint. 
> No other objects — only the [OBJECT NAME] on a transparent background. 
> Leave at least [PADDING]px of transparent space on all sides.

---

## 2. Buildings (`sprites/buildings/`)
**Size:** 256 × 256 px (Large: 384 × 384 px) | **Padding:** 8px
*Buildings are large structures that occupy 3x3 or 4x4 tiles. The front entrance must face the bottom of the canvas.*

| Asset Name | Description / Prompt Details | Size |
|---|---|---|
| `alchemy_shop` | A mystical shop with glowing vials in the windows, perhaps a smoking chimney. | 256×256 |
| `blacksmith_forge_large` | A stone building with a large open forge, anvil, and glowing embers. | 256×256 |
| `castle_entrance` | The grand entrance to a castle with a heavy wooden portcullis. | 384×384 |
| `castle_fortress_large` | A massive stone keep with battlements and arrow slits. | 384×384 |
| `castle_gate_medium` | A fortified stone gatehouse. | 256×256 |
| `chapel_large` | A serene stone chapel with stained glass windows. | 256×256 |
| `church_stone` | A traditional stone church with a tall steeple. | 256×256 |
| `cottage_small` | A cozy, humble peasant cottage with a thatched roof. | 256×256 |
| `dockside_building` | A wooden building built on stilts, smelling of fish and salt. | 256×256 |
| `fortress_small` | A compact but heavily fortified stone outpost. | 384×384 |
| `house_blue_roof_large` | A wealthy merchant's two-story home with a distinct blue shingled roof. | 256×256 |
| `house_large` | A standard large village home, half-timbered. | 256×256 |
| `house_snow` | A sturdy wooden house with a thick layer of snow on the roof. | 256×256 |
| `house_stone_red_roof` | A solid stone house with a bright terracotta tile roof. | 256×256 |
| `house_thatch_large` | A spacious farmhouse with a thick straw roof. | 256×256 |
| `house_thatch_small` | A small, simple thatched-roof dwelling. | 256×256 |
| `inn_large` | A welcoming, bustling inn with warm light spilling from the windows. | 256×256 |
| `magic_shop_crystal` | A bizarre shop with large glowing crystals growing from the roof. | 256×256 |
| `market_food_building` | A permanent covered market building with food displays outside. | 256×256 |
| `market_square` | The central paved hub of a market with permanent stalls attached. | 384×384 |
| `ruin_castle_small` | The crumbling remains of a once-proud stone tower. | 256×256 |
| `tavern_blue_roof` | A lively local pub with a blue roof and a swinging sign. | 256×256 |
| `tavern_red_balcony` | An upscale tavern featuring a wooden balcony and red roof. | 256×256 |
| `watchtower_small` | A tall, narrow stone tower for village guards. | 256×256 |
| `windmill_large` | A tall stone windmill with large wooden sails. | 256×256 |

---

## 3. Large Props (`sprites/props_large/`)
**Size:** 128 × 192 px | **Padding:** 4px
*Tall or wide objects occupying 2x2 tiles. Must sit at the bottom center of the canvas.*

| Asset Name | Description / Prompt Details |
|---|---|
| `bridge_stone_arch` | A sturdy stone bridge arching over a gap. |
| `fountain_round` | A decorative stone fountain with clear water flowing. |
| `ruin_arch_stone` | An ancient, moss-covered stone archway. |
| `statue_angel_01` | A serene marble statue of an angel. |
| `statue_knight` | A proud stone statue of a knight leaning on a sword. |
| `statue_robed` | A mysterious robed figure carved in dark stone. |
| `tent_circus` | A large, colorful striped festival tent. |
| `tent_plain_01` | A large canvas military or merchant tent. |
| `tower_ruins` | The shattered base of a stone tower. |
| `tree_dead` | A large, twisted, leafless spooky tree. |
| `tree_oak_large` | A massive, healthy oak tree with a full green canopy. |
| `tree_pine_tall` | A towering evergreen pine tree. |

---

## 4. Medium Props (`sprites/props_medium/`)
**Size:** 64 × 64 px | **Padding:** 2px
*Objects roughly the height of the player, occupying 1x1 tile.*

| Asset Name | Description / Prompt Details |
|---|---|
| `barrel_pair` | Two wooden barrels sitting next to each other. |
| `campfire_large` | A roaring fire pit surrounded by stones. |
| `chest_treasure` | An ornate wooden chest bound in iron. |
| `fence_long` | A section of wooden fencing. |
| `lamp_post` | A tall iron street lamp with a glowing glass lantern. |
| `market_stall_food` | A wooden stall displaying fruits and vegetables. |
| `market_stall_goods` | A wooden stall displaying various wares and tools. |
| `table_market` | A simple wooden table used for selling items. |
| `well_large` | A stone water well with a wooden roof and bucket. |

---

## 5. Small Props (`sprites/props_small/`)
**Size:** 32 × 48 px | **Padding:** 2px
*Waist-height or smaller objects. Must not touch canvas edges.*

| Asset Name | Description / Prompt Details |
|---|---|
| `barrel_single` | A single standard wooden barrel. |
| `bush_small` | A small, leafy green bush. |
| `campfire` | A small, dying campfire with glowing embers. |
| `crate_small` | A simple wooden shipping crate. |
| `gravestone_cross` | A weathered stone cross grave marker. |
| `gravestone_plain` | A simple, rectangular stone grave marker. |
| `gravestone_rounded` | A classic rounded tombstone. |
| `mushroom_pile` | A cluster of colorful wild mushrooms. |
| `sack_single` | A burlap sack tied at the top. |
| `sign_forest` | A wooden directional sign pointing towards the woods. |
| `sign_village` | A wooden directional sign pointing towards town. |

---

## 6. Characters (NPCs & Player)
**Size:** 256 × 256 px | **Format:** Sprite sheets with 4-directional animations (Idle, Walk).
*Characters require multi-frame sprite sheets. The dimensions below represent the frame size, not the full sheet.*

| Entity ID | Description / Role |
|---|---|
| `hero` | The main player character. Brave, equipped with basic adventurer gear. |
| `guard` | Village militia in chainmail with a spear or halberd. |
| `merchant` | A wealthy trader in fine clothes. |
| `elder` | The wise, old village leader with a walking stick. |
| `apprentice` | A young magic student in oversized robes. |
| `child` | A playful village kid. |
| `blacksmith` | A burly worker with a leather apron and soot on their face. |
| `innkeeper` | A cheerful tavern owner holding a rag or mug. |
| `scholar` | A distracted academic carrying books. |
| `ranger` | A wilderness guide in green cloaks with a bow. |

---

## 7. Creatures & Monsters
**Size:** 256 × 256 px | **Format:** Sprite sheets with 4-directional animations.

### Peaceful Animals
| Entity ID | Description |
|---|---|
| `rabbit` | A small, quick brown or white bunny. |
| `squirrel` | A red squirrel with a bushy tail. |
| `frog` | A green pond frog. |
| `butterfly` | A colorful fluttering insect. |
| `hedgehog` | A small spiky mammal. |

### Monsters
| Entity ID | Description |
|---|---|
| `slime` | A gelatinous, bouncy green blob. |
| `goblin` | A hunched, green-skinned scavenger with a crude weapon. |
| `wolf` | A fierce, grey timber wolf. |
| `spider` | A giant, menacing arachnid. |
| `giant_bug` | An oversized, armored beetle. |
| `giant_snake` | A large, coiled venomous serpent. |
| `skeleton` | An animated pile of bones holding a rusty sword. |
| `zombie` | A shambling, decaying undead villager. |
| `ghost` | A translucent, floating spectral figure. |
| `shadow_stalker` | A dark, formless entity made of pure shadow. |
| `demon` | A terrifying underworld creature with horns. |
| `golem` | A massive, slow-moving construct of stone. |

---

## 8. Terrain & Walls
**Size:** 64 × 64 px | **Format:** Seamlessly tiling textures.
*These must tile perfectly on all four sides (for floors) or horizontally (for walls).*

| Category | Examples |
|---|---|
| **Grassland Floors** | `grass_plain`, `dirt_plain`, `dirt_plants`, `water_shallow`, `water_deep` |
| **Dungeon Floors** | `dungeon_stone`, `cracked_floor`, `lava` |
| **Natural Walls** | `cliff_grey_plain`, `cliff_dirt_dark`, `cliff_grass_overhang` |
| **Manmade Walls** | `wall_stone`, `wall_brick_red`, `fence_wood_old` |
