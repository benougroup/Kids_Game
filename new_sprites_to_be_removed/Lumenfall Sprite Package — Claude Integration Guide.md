# Lumenfall Sprite Package — Claude Integration Guide

This package contains the complete **29-file** sprite set defined by the repository's current `SPRITE_GENERATION_SPECS_FOR_MANUS.md` specification. Every delivered PNG is one standalone RGBA image with the exact required canvas size. `VALIDATION_REPORT.csv` records the automated checks for all assets.

## Package Contents

The root of this folder contains the delivery names from the specification, such as `BUILDINGS_tavern_blue_roof.png`, `CREATURES_rabbit_idle.png`, `PROPS_tree_oak_large.png`, and `NPCS_guard_aldric.png`. All 29 files passed exact-dimension, alpha-channel, transparent-RGB normalization, non-empty-content, and transparent-border validation.

## Runtime Placement

A parallel `assets_for_claude/assets/sprites/` tree has been prepared with filenames that match the current loader conventions. Copy its `assets/sprites/` directory into the Lumenfall public assets location.

| Group | Destination | Notes |
|---|---|---|
| Buildings | `assets/sprites/buildings/` | Nine files retain their lower-case runtime names. |
| Large props | `assets/sprites/props_large/` | `tree_oak_large.png` and `tree_pine_tall.png`. |
| Medium props | `assets/sprites/props_medium/` | `barrel_pair.png`, `bush_small.png`, `well_large.png`, and `campfire.png`. |
| NPCs | `assets/sprites/characters/` | `guard_aldric.png`, `mira_apprentice.png`, and `scholar_vera.png`. |
| Peaceful creatures | `assets/sprites/creatures/animals_peaceful/` | Each creature has its own subdirectory and state basename. |
| Wolf | `assets/sprites/creatures/animals_aggressive/wolf/idle.png` | Matches the current creature folder convention. |
| Monsters | `assets/sprites/creatures/monsters/{slime,spider}/idle.png` | One idle sprite per requested creature. |
| Undead | `assets/sprites/creatures/undead/{skeleton,ghost}/idle.png` | One idle sprite per requested creature. |

## Important Integration Detail

The current `CreatureAssets.ts` loader already recognizes the rabbit, bird, wolf, slime, spider, skeleton, and ghost directories. The delivered squirrel and frog sprites are organized in the expected peaceful-animal hierarchy; add their corresponding loader definitions if the game should load them at runtime.

No legacy packed-atlas files were modified. This package is intended to be integrated as clean individual files, allowing the existing individual-sprite loader to prefer them over legacy atlas frames.
