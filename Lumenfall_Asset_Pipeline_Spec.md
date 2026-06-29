# Lumenfall Asset Pipeline Specification
**Version 1.0 — June 2026**

---

## 1. Purpose

This document defines the rules for creating, naming, sizing, and organizing all visual assets in the Lumenfall game. It exists so that any developer, artist, or AI agent can generate or replace an asset and have it render correctly in the game without manual adjustment.

The core problem with the previous asset pipeline was that **multiple unrelated objects were drawn into a single sprite sheet without consistent frame boundaries**. Some frames contained pixels from adjacent objects, making correct cropping impossible. This specification eliminates that problem by requiring every object to be **its own individual file**.

---

## 2. Perspective and World Scale

The game uses a **3/4 top-down perspective** (the camera looks down at roughly a 45° angle). This creates the illusion of depth: objects further from the player appear higher on the screen.

| World concept | Game measurement | Pixel measurement |
|---|---|---|
| One ground tile | 1 × 1 meter | 64 × 64 px |
| Player character height | ~1.8 m | ~48 px tall on screen |
| A standard house | ~8 × 8 m footprint | 256 × 256 px canvas |
| A large tree | ~4 m wide, ~10 m tall | 128 × 192 px canvas |
| A barrel | ~0.5 m diameter | 32 × 48 px canvas |

**Lighting rule:** All objects must be lit from a neutral overhead-slightly-front source. Shadows fall straight down or slightly toward the bottom of the canvas. Do **not** include cast shadows that extend beyond the object's own footprint — the game engine handles dynamic shadows.

---

## 3. Categories, Sizes, and File Locations

Every asset belongs to exactly one category. The category determines the canvas size and the output directory.

### 3.1 Terrain Tiles — `sprites/terrain/`

Ground textures that tile seamlessly to fill the map floor.

| Property | Value |
|---|---|
| Canvas size | 64 × 64 px |
| Tiling | Must tile seamlessly on all 4 sides |
| Transparency | None — fully opaque |
| Examples | grass, dirt, sand, cobblestone, water, lava, dungeon floor |

### 3.2 Wall Tiles — `sprites/walls/`

Vertical surfaces that form the edges of cliffs, buildings, and caves.

| Property | Value |
|---|---|
| Canvas size | 64 × 64 px |
| Tiling | Must tile horizontally |
| Transparency | None — fully opaque |
| Examples | cliff_natural, cliff_lava, wall_stone, wall_brick |

### 3.3 Small Props — `sprites/props_small/`

Objects that are waist-height or smaller compared to the player. A player character at 48 px tall occupies roughly 1 tile. Small props should look like they would reach the player's knee or hip.

| Property | Value |
|---|---|
| Canvas size | 32 × 48 px |
| Object occupies | ≤ 0.5 × 0.5 tiles |
| Transparency | Required (RGBA PNG) |
| Examples | barrel_single, crate_small, sack_single, sign_village, gravestone_cross, mushroom_pile |

**Critical rule:** The object must be drawn entirely within the 32 × 48 canvas. No pixel of the object may touch the canvas edge. Leave at least 2 px of transparent padding on all sides.

### 3.4 Medium Props — `sprites/props_medium/`

Objects that are roughly the same height as the player, or that occupy 1–1.5 tiles of floor space.

| Property | Value |
|---|---|
| Canvas size | 64 × 64 px |
| Object occupies | ~1 × 1 tile |
| Transparency | Required (RGBA PNG) |
| Examples | campfire, well_large, lamp_post, fence_long, chest_closed, table_small, market_stall_food, barrel_pair |

**Critical rule:** Same padding rule as small props — no pixel touches the canvas edge.

### 3.5 Large Props — `sprites/props_large/`

Tall or wide objects that are significantly larger than the player. Trees, statues, ruins, large tents, and bridges belong here.

| Property | Value |
|---|---|
| Canvas size | 128 × 192 px |
| Object occupies | ~2 × 2 tiles at base, up to 3 tiles tall |
| Transparency | Required (RGBA PNG) |
| Examples | tree_oak_large, tree_pine_tall, tree_dead, statue_knight, ruin_arch_stone, fountain_round, tent_circus, column_ruins |

**Critical rule:** The base of the object (roots, pedestal, ground contact) must sit at the **bottom center** of the canvas. The object should not extend to the canvas edges. Leave at least 4 px of transparent padding on the sides and top.

### 3.6 Buildings — `sprites/buildings/`

Structures that the player can walk around (but not through). They occupy multiple tiles.

| Property | Value |
|---|---|
| Canvas size — standard house | 256 × 256 px |
| Canvas size — large building | 384 × 384 px |
| Object occupies | 3 × 3 tiles (standard) or 4 × 4 tiles (large) |
| Transparency | Required (RGBA PNG) |
| Examples | house_thatch_small (256 px), tavern_blue_roof (256 px), castle_fortress_large (384 px) |

**Critical rule:** The front door / entrance must face the bottom of the canvas. The building footprint (the ground-level walls) must sit at the bottom of the canvas. The roof and upper floors extend upward. Leave at least 8 px of transparent padding on all sides.

---

## 4. Naming Convention

All file names use `snake_case`. The name must be descriptive enough to identify the object without seeing it.

```
{object_type}_{variant_or_material}_{size_qualifier}.png
```

Examples:
- `tree_oak_large.png`
- `barrel_single.png`
- `house_stone_red_roof.png`
- `statue_knight.png`
- `terrain_grass_plain.png`

---

## 5. File Format Requirements

| Requirement | Value |
|---|---|
| Format | PNG |
| Color mode | RGBA (32-bit with alpha channel) |
| Background | Transparent (alpha = 0) |
| Color profile | sRGB |
| Compression | Default PNG compression (no lossy) |

---

## 6. AI Generation Prompt Template

When asking an AI image generator to create a new asset, use this template. Fill in the bracketed fields.

```
Create a single [OBJECT NAME] for a 2D top-down RPG game.

Style: High-quality pixel-art-inspired illustration with rich detail and warm lighting.
Perspective: 3/4 top-down view (camera looks down at ~45 degrees).
Canvas size: [WIDTH] x [HEIGHT] pixels, transparent background (RGBA PNG).
Object size: The [OBJECT NAME] should fill approximately [FILL PERCENTAGE]% of the canvas,
             centered horizontally and aligned to the bottom of the canvas.
Lighting: Soft overhead light, slight warm glow, shadows fall straight down.
No cast shadows outside the object's own footprint.
No other objects in the image — only the [OBJECT NAME] on a transparent background.
Padding: Leave at least [PADDING] pixels of transparent space on all sides.
```

### Filled examples

**Tree (large prop):**
> Create a single large oak tree for a 2D top-down RPG game. Style: high-quality pixel-art-inspired illustration. Perspective: 3/4 top-down view. Canvas size: 128 × 192 pixels, transparent background (RGBA PNG). The tree should fill approximately 80% of the canvas, centered horizontally and aligned to the bottom. Lighting: soft overhead light, shadows fall straight down. No other objects — only the tree on a transparent background. Leave at least 4 pixels of transparent space on all sides.

**Barrel (small prop):**
> Create a single wooden barrel for a 2D top-down RPG game. Style: high-quality pixel-art-inspired illustration. Perspective: 3/4 top-down view. Canvas size: 32 × 48 pixels, transparent background (RGBA PNG). The barrel should fill approximately 70% of the canvas, centered horizontally and aligned to the bottom. Lighting: soft overhead light. No other objects — only the barrel on a transparent background. Leave at least 2 pixels of transparent space on all sides.

---

## 7. Object Catalog

The following table lists every object currently in the game, its category, and its canonical canvas size. This is the authoritative reference for the asset pipeline.

### Buildings

| Name | Category | Canvas | Source atlas |
|---|---|---|---|
| house_thatch_small | buildings | 256 × 256 | buildings_v003 |
| house_thatch_large | buildings | 256 × 256 | buildings_v003 |
| house_stone_red_roof | buildings | 256 × 256 | buildings_v003 |
| house_blue_roof_large | buildings | 256 × 256 | buildings_v003 |
| house_snow | buildings | 256 × 256 | objects_props_v003 |
| tavern_blue_roof | buildings | 256 × 256 | buildings_v003 |
| tavern_red_balcony | buildings | 256 × 256 | buildings_v003 |
| alchemy_shop | buildings | 256 × 256 | buildings_v003 |
| magic_shop_crystal | buildings | 256 × 256 | buildings_v003 |
| market_food_building | buildings | 256 × 256 | buildings_v003 |
| blacksmith_forge_large | buildings | 256 × 256 | buildings_v003 |
| watchtower_small | buildings | 256 × 256 | buildings_v003 |
| chapel_large | buildings | 256 × 256 | buildings_v003 |
| castle_gate_medium | buildings | 256 × 256 | buildings_v003 |
| castle_fortress_large | buildings | 384 × 384 | buildings_v003 |
| ruin_castle_small | buildings | 256 × 256 | buildings_v003 |
| dockside_building | buildings | 256 × 256 | buildings_v003 |
| windmill_large | buildings | 256 × 256 | buildings_v003 |
| cottage_small | buildings | 256 × 256 | buildings_v002 |
| inn_large | buildings | 256 × 256 | buildings_v002 |
| castle_entrance | buildings | 384 × 384 | buildings_v002 |
| house_large | buildings | 256 × 256 | buildings_v002 |
| market_square | buildings | 384 × 384 | buildings_v002 |
| church_stone | buildings | 256 × 256 | buildings_v002 |
| fortress_small | buildings | 384 × 384 | buildings_v002 |
| dockside_large | buildings | 256 × 256 | buildings_v002 |
| windmill_small | buildings | 256 × 256 | buildings_v002 |

### Large Props

| Name | Category | Canvas | Source atlas |
|---|---|---|---|
| tree_oak_large | props_large | 128 × 192 | objects_props_v002 |
| tree_pine_tall | props_large | 128 × 192 | objects_props_v002 |
| tree_dead | props_large | 128 × 192 | objects_props_v002 |
| tree_ruins_combo | props_large | 128 × 192 | objects_props_v003 |
| statue_knight | props_large | 128 × 192 | objects_props_v003 |
| statue_robed | props_large | 128 × 192 | objects_props_v003 |
| statue_angel_01 | props_large | 128 × 192 | objects_props_v003 |
| statue_angel_02 | props_large | 128 × 192 | objects_props_v003 |
| ruin_arch_stone | props_large | 128 × 192 | objects_props_v003 |
| tower_ruins | props_large | 128 × 192 | objects_props_v003 |
| column_ruins | props_large | 128 × 192 | objects_props_v003 |
| fountain_round | props_large | 128 × 192 | objects_props_v003 |
| sarcophagus | props_large | 128 × 192 | objects_props_v003 |
| bridge_stone_arch | props_large | 128 × 192 | objects_props_v003 |
| bridge_stone_railing | props_large | 128 × 192 | objects_props_v003 |
| tent_circus | props_large | 128 × 192 | objects_props_v003 |
| tent_plain_01 | props_large | 128 × 192 | objects_props_v003 |
| tent_plain_02 | props_large | 128 × 192 | objects_props_v003 |
| tent_plain_03 | props_large | 128 × 192 | objects_props_v003 |
| tent_plain_04 | props_large | 128 × 192 | objects_props_v003 |

### Medium Props

| Name | Category | Canvas | Source atlas |
|---|---|---|---|
| barrel_pair | props_medium | 64 × 64 | objects_props_v002 |
| barrel_triple | props_medium | 64 × 64 | objects_props_v002 |
| log_pile | props_medium | 64 × 64 | objects_props_v002 |
| rock_large | props_medium | 64 × 64 | objects_props_v002 |
| hay_bale | props_medium | 64 × 64 | objects_props_v002 |
| campfire | props_medium | 64 × 64 | objects_props_v002 |
| campfire_large | props_medium | 64 × 64 | objects_props_v003 |
| bush_small | props_medium | 64 × 64 | objects_props_v002 |
| lamp_post | props_medium | 64 × 64 | objects_props_v002 |
| lamp_post_2 | props_medium | 64 × 64 | objects_props_v002 |
| fence_long | props_medium | 64 × 64 | objects_props_v002 |
| pillory | props_medium | 64 × 64 | objects_props_v002 |
| well_large | props_medium | 64 × 64 | objects_props_v002 |
| skull_pile | props_medium | 64 × 64 | objects_props_v002 |
| chest_closed | props_medium | 64 × 64 | objects_props_v002 |
| chest_open | props_medium | 64 × 64 | objects_props_v002 |
| chest_medium | props_medium | 64 × 64 | objects_props_v003 |
| chest_treasure | props_medium | 64 × 64 | objects_props_v003 |
| cauldron_small | props_medium | 64 × 64 | objects_props_v002 |
| cauldron_magic | props_medium | 64 × 64 | objects_props_v003 |
| cooking_pot | props_medium | 64 × 64 | objects_props_v002 |
| bucket_pair | props_medium | 64 × 64 | objects_props_v002 |
| bucket_magic | props_medium | 64 × 64 | objects_props_v003 |
| table_small | props_medium | 64 × 64 | objects_props_v002 |
| table_large | props_medium | 64 × 64 | objects_props_v002 |
| table_market | props_medium | 64 × 64 | objects_props_v003 |
| market_stall_food | props_medium | 64 × 64 | objects_props_v002 |
| market_stall_goods | props_medium | 64 × 64 | objects_props_v002 |
| market_stall_large | props_medium | 64 × 64 | objects_props_v002 |
| market_stall_covered | props_medium | 64 × 64 | objects_props_v002 |
| crate_pile | props_medium | 64 × 64 | objects_props_v003 |

### Small Props

| Name | Category | Canvas | Source atlas |
|---|---|---|---|
| barrel_single | props_small | 32 × 48 | objects_props_v002 |
| crate_small | props_small | 32 × 48 | objects_props_v002 |
| sack_single | props_small | 32 × 48 | objects_props_v002 |
| sack_pair | props_small | 32 × 48 | objects_props_v002 |
| sack_pile | props_small | 32 × 48 | objects_props_v003 |
| fence_short | props_small | 32 × 48 | objects_props_v002 |
| well_small | props_small | 32 × 48 | objects_props_v002 |
| cart_empty | props_small | 32 × 48 | objects_props_v002 |
| sign_village | props_small | 32 × 48 | objects_props_v002 |
| sign_forest | props_small | 32 × 48 | objects_props_v002 |
| sign_market | props_small | 32 × 48 | objects_props_v002 |
| sign_double | props_small | 32 × 48 | objects_props_v002 |
| gravestone_plain | props_small | 32 × 48 | objects_props_v002 |
| gravestone_cross | props_small | 32 × 48 | objects_props_v002 |
| gravestone_rounded | props_small | 32 × 48 | objects_props_v002 |
| mushroom_pile | props_small | 32 × 48 | objects_props_v002 |

---

## 8. Known Issues in Current Assets (to fix when regenerating)

The following objects have confirmed pixel-bleeding problems in the original sprite sheets. When these are regenerated, they must be created as isolated individual files per the rules above.

| Object | Problem |
|---|---|
| `tree_oak_large` | Bottom of frame contains crate/barrel pixels from adjacent sprite |
| `tree_pine_tall` | Bottom of frame contains crate/barrel pixels from adjacent sprite |
| `tree_dead` | Bottom of frame contains crate/barrel pixels from adjacent sprite |
| `magic_shop_crystal` | Shares identical atlas coordinates with `house_blue_roof_large` |
| `tower_ruins` | Shares identical atlas coordinates with `tree_ruins_combo` |

---

## 9. Workflow for Adding a New Object

1. Determine the object's **category** from Section 3.
2. Note the **canvas size** for that category.
3. Generate the image using the **AI prompt template** from Section 6, specifying the exact canvas size.
4. Save the file as `sprites/{category}/{object_name}.png`.
5. Add an entry to the game's `MapBuilder` or `EntityRegistry` referencing the new file path.
6. Run the audit script (`tools/audit_atlases.py`) to verify no duplicates were introduced.
