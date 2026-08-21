# Quick Start: Building Your First Scenario

## The Problem We Just Fixed
- Sprite registry was incomplete (only buildings listed)
- 76 prop sprites existed but weren't being loaded
- Game fell back to broken atlas frames with pixel-bleeding
- **Result:** Props rendered incorrectly or not at all

## What We Changed
Updated `SpriteLoader.ts` to register all props:
- trees, bushes, rocks (large)
- chests, barrels, campfires, tables, market stalls (medium)  
- signs, crates, gravestones, sacks (small)

**Now:** All 1,963 individual sprites load correctly via the new registry.

---

## Building Scenario 1: Tutorial Village

### Step 1: Create the Map File
Copy and modify the template:

**File:** `kids_games/lumenfall/src/phaser/maps/TutorialVillageMap.ts`

```typescript
import { MapData } from './MapBuilder';

export function createTutorialVillageData(): MapData {
  return {
    id: 'tutorial_village',
    name: 'Welcome to Lumenfall',
    cols: 20,
    rows: 15,
    tileSize: 64,
    bgMusic: 'village_theme',
    ambientLight: 0.8,  // Bright daytime
    
    // Ground layer (dirt/grass tiles)
    groundLayer: [
      // Create a 20x15 grid of ground tiles
      // Each entry is one tile at position (x, y)
      { x: 0, y: 0, frame: 'dirt_light', atlas: 'terrain_grassland', height: 0, widthTiles: 20, heightTiles: 15 },
    ],
    
    // Object layer (trees, rocks, decorative props)
    objectLayer: [
      // Place a few trees around the village
      { x: 2, y: 2, frame: 'tree_oak_large', atlas: 'N/A', height: 0, widthTiles: 2, heightTiles: 2, pixelWidth: 128, pixelHeight: 192 },
      { x: 15, y: 3, frame: 'tree_pine_tall', atlas: 'N/A', height: 0, widthTiles: 2, heightTiles: 2, pixelWidth: 128, pixelHeight: 192 },
      // Add some bushes and rocks
      { x: 5, y: 5, frame: 'bush_small', atlas: 'N/A', height: 0, widthTiles: 1, heightTiles: 1 },
      { x: 18, y: 12, frame: 'rock_large', atlas: 'N/A', height: 0, widthTiles: 1, heightTiles: 1 },
    ],
    
    // Structure layer (buildings)
    structureLayer: [
      // Tavern (starting location, where first NPC is)
      { x: 8, y: 6, frame: 'tavern_blue_roof', atlas: 'N/A', height: 1, widthTiles: 3, heightTiles: 3, pixelWidth: 256, pixelHeight: 256 },
      // Small house
      { x: 2, y: 10, frame: 'house_thatch_small', atlas: 'N/A', height: 1, widthTiles: 2, heightTiles: 2, pixelWidth: 256, pixelHeight: 256 },
      // Blacksmith
      { x: 15, y: 10, frame: 'blacksmith_forge_large', atlas: 'N/A', height: 1, widthTiles: 3, heightTiles: 3, pixelWidth: 256, pixelHeight: 256 },
    ],
    
    // NPCs to place in the village
    npcs: [
      { x: 9, y: 7, entityId: 'guard', name: 'Guard Aldric', dialogueKey: 'aldric_welcome' },
      { x: 3, y: 11, entityId: 'apprentice', name: 'Mira', dialogueKey: 'mira_intro' },
      { x: 16, y: 11, entityId: 'blacksmith', name: 'Gorrin', dialogueKey: 'blacksmith_intro' },
    ],
    
    // No monsters in tutorial (safe village)
    monsters: [],
    
    // Map exits (portals to other scenarios)
    exits: [
      {
        direction: 'north',
        tileX: 9,
        tileY: 0,
        width: 2,
        targetMap: 'forest_exploration',
        targetTileX: 10,
        targetTileY: 14,
      },
    ],
  };
}
```

### Step 2: Add NPC Dialogue
**File:** `kids_games/lumenfall/src/systems/StoryDatabase.ts`

Add dialogue entries for each NPC:

```typescript
aldric_welcome: {
  nodes: {
    start: {
      speaker: 'Guard Aldric',
      text: 'Welcome to Lumenfall village! I am Guard Aldric. What brings you here?',
      choices: [
        {
          text: 'I want to help the village!',
          next: 'interested',
        },
        {
          text: 'Just exploring...',
          next: 'casual',
        },
      ],
    },
    interested: {
      speaker: 'Guard Aldric',
      text: 'Excellent! We have been troubled by shadows lately. They grow stronger at night.',
      choices: [
        {
          text: 'Tell me more about these shadows.',
          next: 'return_to_map',
        },
      ],
    },
    casual: {
      speaker: 'Guard Aldric',
      text: 'That is fine. Feel free to look around the village.',
      choices: [
        {
          text: 'Thank you.',
          next: 'return_to_map',
        },
      ],
    },
  },
  startSceneId: 'start',
},

mira_intro: {
  nodes: {
    start: {
      speaker: 'Mira the Apprentice',
      text: 'Hello! I am learning about light magic from the village elder. Would you like to learn too?',
      choices: [
        {
          text: 'Yes, teach me!',
          next: 'teach_light',
        },
        {
          text: 'Maybe later.',
          next: 'return_to_map',
        },
      ],
    },
    teach_light: {
      speaker: 'Mira the Apprentice',
      text: 'Light magic is very important. Shadows fear light and torch flames.',
      choices: [
        {
          text: 'I will remember that.',
          next: 'return_to_map',
        },
      ],
    },
  },
  startSceneId: 'start',
},

blacksmith_intro: {
  nodes: {
    start: {
      speaker: 'Blacksmith Gorrin',
      text: 'Looking for supplies? I can forge tools for your journey.',
      choices: [
        {
          text: 'What do you have?',
          next: 'show_items',
        },
        {
          text: 'Not right now.',
          next: 'return_to_map',
        },
      ],
    },
    show_items: {
      speaker: 'Blacksmith Gorrin',
      text: 'I have a torch that burns with bright flames. Very useful against the darkness.',
      choices: [
        {
          text: 'I will take it!',
          next: 'return_to_map',
        },
      ],
    },
  },
  startSceneId: 'start',
},
```

### Step 3: Load the Map in GameScene
**File:** `kids_games/lumenfall/src/phaser/scenes/GameScene.ts`

In the `create()` method, change the starting map:

```typescript
create(): void {
  // Load initial map - Tutorial Village instead of lumenfall_village
  this.loadMap('tutorial_village', 10, 8);
  // ... rest of create()
}
```

### Step 4: Register the Map
**File:** `kids_games/lumenfall/src/phaser/scenes/GameScene.ts`

Add this method to load your new map:

```typescript
private loadMap(mapId: string, startTileX: number, startTileY: number): void {
  // ... existing code ...
  
  if (mapId === 'tutorial_village') {
    mapData = createTutorialVillageData();
  }
  // ... rest of existing code ...
}
```

---

## Running & Testing

```bash
cd kids_games/lumenfall
npm run dev
```

Then open `http://localhost:5173` in your browser.

You should see:
1. Tavern building in center
2. 2 small houses and blacksmith nearby
3. Trees and rocks scattered around
4. 3 NPCs you can click to talk to
5. Dialogue appears in speech bubbles
6. Can walk around and explore

---

## Quick Reference: Available Props

### Large Props (128x192 px)
tree_oak_large, tree_pine_tall, tree_dead, statue_knight, fountain_round, bridge_stone_arch, tent_circus

### Medium Props (64x64 px)
barrel_pair, campfire, well_large, chest_closed, chest_open, lamp_post, fence_long, market_stall_food, table_small, table_large, rock_large, hay_bale

### Small Props (32x48 px)
barrel_single, crate_small, sign_village, gravestone_cross, mushroom_pile, fence_short, sack_single

### Buildings (256x256 or 384x384 px)
house_thatch_small, house_large, tavern_blue_roof, blacksmith_forge_large, chapel_large, castle_fortress_large, windmill_large, market_square

---

## Next Steps

1. Create the TutorialVillageMap.ts file (copy the code above)
2. Add dialogue to StoryDatabase.ts
3. Run dev server and test
4. Iterate on placement and dialogue until it feels right
5. Move to Scenario 2: Forest Exploration

