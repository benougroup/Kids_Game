# Lumenfall

Lumenfall is a canvas-based browser game starter built with Vite + TypeScript and set up for GitHub Pages deployment.

## Requirements

- Node.js 18+
- npm 9+

## Local development

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This project is configured for GitHub Pages via Vite's `base` option:

```ts
base: process.env.BASE_PATH ?? '/lumenfall/'
```

By default, assets are served from `/lumenfall/`, which matches a repository named `lumenfall`.

### Use a different repository name

Set `BASE_PATH` to your repo path before building:

```bash
BASE_PATH=/your-repo-name/ npm run build
```

Make sure the value starts and ends with `/`.

### Automatic deployment

A GitHub Actions workflow is included in `.github/workflows/pages.yml`. On every push to `main`, it:

1. Installs dependencies.
2. Builds the project (output in `dist/`).
3. Uploads `dist/` as the Pages artifact.
4. Deploys to GitHub Pages using the official `pages` deployment action.

## Demo map authoring model

Maps are now data-driven and include:

- `terrainMetaByTileId` for numeric `terrainLevel` and `movementType`.
- `objects` for building/prop/wall/tree/lightPost/pickup placement and collision footprints.
- `npcs` with interaction scene definitions and day/night variants.
- `interactables` for doors and stations.

### Movement + collision

- Terrain blocks movement when `terrainLevel <= -1`.
- Terrain with `terrainLevel > -1` is walkable (including shallow water like `-0.5`).
- Object collision is checked independently of terrain/tile art.

### Demo maps

- `bright_hollow_town`
- `light_hall_interior`
- `forest_edge_demo`
- `shrine_demo`

Each map can define transitions through `interactables` (`type: "door"`).

## Re-architecture baseline (RPG Story Engine V1)

The project now includes a first-pass world profile for JSON-tunable mechanics:

- `src/data/world_profile.v1.json`: world setting, 7-axis spatial model, environment multipliers, NPC panic behavior profiles, and combat damage affinities.
- `src/systems/WorldProfileSystem.ts`: typed helper layer used by game systems to resolve:
  - depth-step walkability (`-1` blocked, `0.5` climb delta support),
  - shadow spawn multiplier from `time phase x weather`,
  - NPC runtime status (`standing/walking/panic`) from profile + panic score + time/weather.

See `ARCHITECTURE_V1.md` for the longer-term roadmap to support story packs, puzzles, multi-map progression, and richer trigger-driven gameplay.
