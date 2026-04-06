# Lumenfall Re-architecture (Story RPG Engine V1)

This document starts the re-engineering effort toward a reusable RPG story engine where new stories are mostly JSON/data work.

## V1 Goals

- Story-first gameplay with reusable mechanics.
- JSON-driven story content (dialogue trees, triggers, checkpoints, rewards, map links).
- Environmental simulation (day/night + weather/fog) that changes NPC behavior and shadow pressure.
- Multi-map progression with transitions, portals, hidden doors, and memory scene playback hooks.
- Item-centric progression (torch/light upgrades, puzzle items, combat tools).

## World model (7-axis spatial vector)

Every world actor/tile can be represented with a vector:

- `x`, `y`: classic map coordinates.
- `depth`: elevation/water/hole logic (`<= -1` blocked, `-0.5` shallow, `>= 100` blocked wall/mountain).
- `hazard`: floor danger (lava/corruption/acid) for passive damage zones.
- `perspective`: draw priority helper for pseudo-3D overlap.
- `aux1`, `aux2`: reserved dimensions for stealth, occlusion, scent, timeline layer, etc.

## Runtime pipeline (target)

1. **World Profile**: global mechanics tuning (`src/data/world_profile.v1.json`).
2. **Map Data**: terrain/object/interactable/NPC placement and trigger wiring.
3. **Story Data**: scenes + choices + effects + conditions.
4. **Systems**:
   - Time/Light/Weather systems update environment.
   - NPC behavior/status resolution from profile + world conditions.
   - Shadow spawning and encounters scaled by world profile multipliers.

## JSON extension strategy

### NPC schema direction

Each NPC can now opt in to:

- `behaviorProfileId`: references a profile in the world profile JSON.
- `panicBase`: baseline panic tendency.
- `homeX`, `homeY`, `walkRadius`: movement bounds for walk loops.

### Combat affinity direction

Global world profile defines what item categories damage which enemy families:

- shadows -> fire/torch/light,
- monsters -> physical weapons,
- hostile NPCs -> restricted weapon set.

## Story pack workflow (future)

A story pack should eventually include:

- `stories.json` entry,
- one or more scene JSON files,
- map JSON references,
- item and encounter templates,
- optional puzzle packs (math, reading comprehension).

This allows adding new adventures without changing core engine code.
