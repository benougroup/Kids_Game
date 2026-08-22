# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lumenfall** is a tile-based narrative adventure game built with TypeScript and Phaser 3. The project emphasizes a clean architecture with separate concerns for state management, systems, rendering, and UI. Development focuses on a 9-map playfield with terrain-based movement mechanics and scenario-based testing.

**Current State (2026-08-22):**
- 9 interconnected maps with 3-portal layout (no 4-portal squares)
- 64+ terrain types with movement metadata (walkable, water, sand, walls, etc.)
- Landing page with scenario selector (gameplay + testing modes)
- Clean from-scratch approach with old code preserved for reference

## Repository Structure

```
/workspaces/Kids_Game
├── kids_games/lumenfall/           # Main game project
│   ├── src/
│   │   ├── main.ts                 # Entry point
│   │   ├── app/                    # Application layer
│   │   │   ├── GameApp.ts          # Main game controller
│   │   │   ├── ModeMachine.ts      # Game mode state
│   │   │   ├── EventBus.ts         # Event system
│   │   │   ├── CommandQueue.ts     # Command buffering
│   │   │   ├── Scenarios.ts        # Scenario definitions (gameplay + testing)
│   │   │   ├── LandingPage.ts      # Landing UI component
│   │   │   ├── landing.css         # Landing page styles
│   │   │   └── Config.ts           # Game constants (TILE_SIZE, etc.)
│   │   ├── engine/                 # Low-level engine
│   │   │   ├── Renderer.ts         # Rendering pipeline
│   │   │   ├── GameLoop.ts         # Update/render loop
│   │   │   ├── Input.ts            # Input handling
│   │   │   ├── Camera.ts           # Camera control
│   │   │   ├── AssetManager.ts     # Asset loading
│   │   │   └── Animation.ts        # Animation system
│   │   ├── state/                  # State management
│   │   │   ├── StateStore.ts       # Central state (transaction-based)
│   │   │   ├── StateTypes.ts       # TypeScript types for game state
│   │   │   └── Invariants.ts       # State validation
│   │   ├── systems/                # Game systems
│   │   │   ├── MapSystem.ts        # Map & terrain data + portal logic
│   │   │   ├── PlayerSystem.ts     # Player movement
│   │   │   ├── TriggerSystem.ts    # Map trigger handling
│   │   │   ├── TimeSystem.ts       # Day/night cycle
│   │   │   ├── LightSystem.ts      # Light rendering
│   │   │   ├── SaveSystem.ts       # Save/load
│   │   │   ├── CheckpointSystem.ts # Checkpoint management
│   │   │   ├── CraftingSystem.ts   # Recipe crafting
│   │   │   ├── DialogueSystem.ts   # Dialogue & scenes
│   │   │   ├── EffectInterpreter.ts # Effect execution
│   │   │   ├── InventorySystem.ts  # Item management
│   │   │   ├── ShadowSystem.ts     # Shadow spawning
│   │   │   └── [Databases].ts      # ItemDatabase, RecipeDatabase, etc.
│   │   ├── data/                   # Data definitions
│   │   │   ├── TerrainRegistry.ts  # 64+ terrain types with movement specs
│   │   │   ├── maps/               # Map data (TypeScript factories & JSON)
│   │   │   │   ├── town.ts, village.ts, graveyard.ts, etc.
│   │   │   │   └── [legacy JSON maps & TS builders]
│   │   │   └── scenes/             # Story scene definitions
│   │   └── phaser/                 # Phaser-specific code (NOT primary)
│   │       ├── systems/            # Phaser-specific helpers
│   │       ├── entities/           # Phaser entity wrappers
│   │       ├── scenes/             # Phaser scene definitions
│   │       ├── maps/               # Legacy map builders
│   │       └── ui/                 # UI components (Phaser)
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Scripts: dev, build, test
│   └── tsconfig.json
└── sprites_for_lumenfall/          # Manus-generated sprite assets
    ├── BUILDINGS_*.png
    ├── NPCS_*.png
    ├── CREATURES_*.png
    └── PROPS_*.png
```

## Build & Development

**Working Directory:** `kids_games/lumenfall/`

### Common Commands

```bash
# Development server (http://localhost:5173/Kids_Game/)
npm run dev

# Production build
npm run build

# Run tests
npm run test

# Type check only (part of build)
tsc --noEmit

# Preview production build
npm run preview
```

### Development Workflow

1. **Start dev server:** `npm run dev`
2. **Landing page appears** on load → select a scenario (gameplay or testing)
3. **Select scenario** → game starts at specified map + position
4. **Test in place** → no app restart needed for different scenarios
5. **Build before push:** `npm run build` (TypeScript check + Vite build)

**Important:** The landing page can be toggled to quickly switch between scenarios without restarting the dev server. Use testing scenarios to isolate and debug specific features.

## Architecture Patterns

### State Management (Transaction-Based)

The **StateStore** uses an immutable transaction pattern:
- All state mutations go through `.beginTx(reason)` → modify `draftState` → `.commitTx(tx)`
- Transactions track which slices were touched (e.g., `touchRuntimePlayer`, `touchStory`)
- Invariants validated on commit
- Immutable reads via `.get()` return readonly snapshots

**Why:** Enables savepoints, undo/redo, and predictable state flow. Every state change is traced.

```typescript
const tx = store.beginTx('player_moved');
tx.touchRuntimePlayer();
tx.draftState.runtime.player.x = newX;
store.commitTx(tx);
```

### Event Bus & Command Queue

- **EventBus:** Systems emit typed events (e.g., `'PLAYER_MOVED'`, `'TIME_PHASE_START'`)
- **CommandQueue:** Input → commands → queued and processed in order (move, interact, etc.)
- **ModeMachine:** Tracks game modes (EXPLORATION, DIALOGUE, INVENTORY, etc.) and mode-specific logic

Systems subscribe to bus events and emit commands to queue. This decouples input, rendering, and game logic.

### Map & Terrain System

**TerrainRegistry** (`src/data/TerrainRegistry.ts`):
- 64+ terrain types with metadata: `height`, `movementType`, `moveCostMultiplier`
- `height ≤ -1` = blocked (deep water, walls), `height ≥ 0` = walkable
- `movementType` in `['normal', 'shallowWater', 'deepWater', 'sand', 'mud', 'ice', 'blocked']`

**MapSystem** (`src/systems/MapSystem.ts`):
- Loads and manages all maps from `MapSystem.maps` registry
- Portal logic via `interactables` (doors with `toMapId`, `toX`, `toY`)
- Movement blocking: `isBlocked(mapId, x, y)` checks terrain + objects + collision layer
- Terrain query: `getTerrainAt(mapId, x, y)` returns terrain metadata for movement

**Map Data Format** (from `TerrainRegistry` + map files):
```typescript
TileMap {
  id: string
  width, height: number
  layers: { ground: number[], decor: number[], collision: number[], overlay: number[] }
  tilePalette: Record<string, { name, color, spriteId? }>
  terrainMetaByTileId: Record<string, { terrainLevel, movementType, moveCostMultiplier }>
  interactables: Interactable[]  // Portals as doors
  npcs?: NpcDefinition[]
  objects?: MapObject[]
}
```

### Scenarios & Testing

**Scenarios** (`src/app/Scenarios.ts`):
- Define entry points with map ID and spawn coordinates
- Split into `'gameplay'` (main campaign) and `'testing'` (feature-specific tests)
- Allow clean switching without app restart

**Landing Page** (`src/app/LandingPage.ts`):
- Shows on app start with scenario selector UI
- Clicking scenario → `GameApp.startScenario(id)` → reset player position & map
- Supports rapid iteration on individual features

## Code Organization & Conventions

### Naming & Organization

- **Systems:** Classes ending in `System` (MapSystem, PlayerSystem, etc.)
- **Databases:** Static record objects (ItemDatabase, RecipeDatabase, etc.)
- **Types:** Defined in `StateTypes.ts` and individual module files
- **Constants:** `Config.ts` for game constants; TILE_SIZE, canvas size, etc.
- **Data factories:** Map/scenario data defined as functions returning typed objects

### File Structure Within Systems

- **public interface** at top (types, exports)
- **class/object implementation** below
- **initialization/setup methods** last
- No deep nesting; each system has clear entry points

### Immutability & Side Effects

- State mutations only via transactions
- Systems don't mutate input parameters; they read and return/emit
- Side effects (rendering, audio, network) isolated to engine and specific systems
- Avoid global state; pass dependencies explicitly

## Map Creation & Terrain Setup

### Creating a New Map

Maps are defined as TypeScript factories in `src/data/maps/{mapId}.ts`:

```typescript
import { TERRAIN_REGISTRY, getTerrainMetadata, getTilePaletteEntry } from '../TerrainRegistry';

export function createMyMapName(): TileMap {
  const terrainMetaByTileId: Record<string, TerrainTileMetadata> = {};
  const tilePalette: Record<string, { name: string; color: string; spriteId?: string }> = {};

  let tileId = 0;

  // Register terrain types
  for (const terrain of [TERRAIN_REGISTRY.grass_plain, /* ... */]) {
    const id = String(tileId);
    terrainMetaByTileId[id] = getTerrainMetadata(terrain);
    tilePalette[id] = getTilePaletteEntry(id, terrain);
    tileId++;
  }

  // Build ground layer
  const groundLayer: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      groundLayer.push(/* tile ID */);
    }
  }

  return {
    id: 'my_map_id',
    name: 'Map Display Name',
    tileSize: 32,
    width: 24,
    height: 16,
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
      { id: 'portal_north', type: 'door', x: 12, y: 0, toMapId: 'destination_map', toX: 12, toY: 14 },
    ],
    triggers: [],
  };
}
```

Then **register** in `MapSystem.ts`:
```typescript
import { createMyMapName } from '../data/maps/my_map';
// In MapSystem constructor:
const maps: Record<string, TileMap> = {
  // ...
  my_map_id: createMyMapName(),
};
```

### Portal Connectivity

- Each map has max 3 portals (north, south, east, west)
- Avoid 4-portal squares (boring layout)
- Portal spawn points must be on walkable terrain (terrainLevel ≥ 0)
- Use consistent naming: `portal_{direction}`

## Testing

- **Framework:** Vitest (`npm run test`)
- **Existing test:** `LightSystem.test.ts` (example structure)
- **Run single test:** `npx vitest run src/systems/LightSystem.test.ts`
- Test systems in isolation; mock dependencies if needed

No comprehensive test suite yet; testing is scenario-based during development.

## Current Development Focus

**Phase 1 (Current):** Playfield & Walking Mechanics
- 9 maps with terrain foundation ✅
- Landing page with scenarios ✅
- Next: Test terrain blocking, movement costs, portal transitions

**Reference Files (Do Not Use):**
- `src/phaser/maps/` — Old map builders (kept for reference)
- `new_sprites_to_be_removed/` — Old sprite collections (reference only)

**Active Scenarios for Testing:**
- `test_terrain_mechanics` — Verify walkable vs. blocked terrain
- `test_map_objects` — Check object rendering and cutouts
- `test_portal_connectivity` — Verify all transitions work

## Important Constants & Config

**File:** `src/app/Config.ts`
- `TILE_SIZE = 32` — Pixel size of each tile
- World dimensions hardcoded in `GameApp` (WORLD_TILE_WIDTH/HEIGHT = 100)

**File:** `src/data/TerrainRegistry.ts`
- Terrain types keyed by ID (string): `'grass_plain'`, `'water_deep'`, etc.
- All terrain types referenced when building map tile palettes

## Performance & Rendering

- **Renderer:** Custom pipeline via `engine/Renderer.ts` (Phaser-based)
- **Camera:** Follows player at tile level; zoom is fixed
- **Light system:** Embedded light sources and shadows rendered per frame
- **Chunks:** No tiling/chunks yet; all maps < 24x16 tiles

No performance optimizations needed at current map sizes. Monitor if maps grow > 50x50 tiles.

## Common Issues & Solutions

**Problem:** Build fails with TypeScript errors
- Run `tsc --noEmit` to see full error output (not just Vite's summary)
- Check state shape in `StateTypes.ts` if adding new runtime properties

**Problem:** Portal doesn't transition
- Verify spawn point is walkable (check terrainMetaByTileId at spawn coords)
- Ensure destination map is registered in MapSystem.maps
- Check interactable `type: 'door'` with `toMapId`, `toX`, `toY` set

**Problem:** Terrain doesn't block movement
- Verify terrain `terrainLevel ≤ -1` (deep water/walls) in TerrainRegistry
- Check terrainMetaByTileId has entry for that tile ID
- Ensure MapSystem.isBlocked() is called before movement

**Problem:** Sprite not rendering
- Check `spriteId` in tilePalette matches an asset loaded by AssetManager
- Verify sprite PNG in `sprites_for_lumenfall/` and asset manifest

## Getting Productive Quickly

1. **Understand state flow:** Read `src/state/StateStore.ts` and `src/app/GameApp.ts` (update loop)
2. **Pick a scenario:** Open landing page UI code to see how scenarios map to starting positions
3. **Trace a feature:** Follow MapSystem.isBlocked() → terrain query → StateStore transaction
4. **Add a new map:** Copy existing map factory (e.g., `town.ts`) and adjust terrain
5. **Test iteratively:** Use scenarios to jump straight to the area you're working on

## References

- **Main entry:** `src/main.ts` → GameApp.start()
- **Game loop:** `src/app/GameApp.ts` — update/render cycle and command processing
- **State shape:** `src/state/StateTypes.ts` — all game state properties
- **Terrain data:** `src/data/TerrainRegistry.ts` — all terrain types and movement specs
- **Maps:** `src/systems/MapSystem.ts` and `src/data/maps/*.ts` — map data and logic
- **Scenarios:** `src/app/Scenarios.ts` — testing and gameplay entry points
