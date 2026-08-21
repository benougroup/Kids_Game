# Lumenfall RPG Rebuild Plan

## Status: Phase 1 - Asset Pipeline COMPLETE

---

## What Was Fixed

### Root Cause Identified & Resolved
The game had **1,963 individual sprite files** already organized by category, but the sprite loading registry was incomplete. The `SpriteLoader.ts` only listed buildings, causing all props (trees, barrels, chests, etc.) to fall back to the **broken atlas frames** that had pixel-bleeding issues.

### Changes Made
1. **Updated `SpriteLoader.ts`** to include all 76 prop sprites:
   - props_large: 20 sprites (trees, statues, ruins, tents, bridges)
   - props_medium: 32 sprites (barrels, chests, campfires, tables, market stalls)
   - props_small: 16 sprites (crates, signs, gravestones, mushrooms, sacks)

2. **Verified Build** - TypeScript compiles cleanly, Vite build succeeds

---

## Architecture Overview

### Already Built & Working
- **Entity System**: NPCs, monsters, characters with state management (idle, walk, run, attack, dead, frozen)
- **Dialogue System**: Branching conversations, conditional choices, story sequences
- **Light/Shadow System**: Day/night cycle, shadow monster spawning, torch mechanics
- **Story System**: Story database, scene management, dialogue branching
- **Mini-game System**: Math challenge framework (MathGameSystem)
- **Map Builder**: Data-driven map construction from JSON
- **Physics & Movement**: 8-direction movement, click-to-move pathfinding
- **Inventory System**: Item tracking and management

### Sprite Categories (Now Fully Registered)
```
assets/sprites/
├── buildings/         (27 buildings - all registered)
├── props_large/       (20 props - NOW REGISTERED)
├── props_medium/      (32 props - NOW REGISTERED)  
├── props_small/       (16 props - NOW REGISTERED)
├── characters/        (19 character variants)
├── creatures/         (35+ monster/animal types)
├── items/             (100+ item sprites)
├── effects/           (particle effects)
├── equipment/         (armor, weapons, clothing)
├── environment/       (terrain variants)
├── terrain/           (ground tiles, roads, walls)
└── portals/           (map transition effects)
```

---

## Next Phases

### Phase 2: Content & Story (Your Priority)
Build 6 scenarios for the kid to play through:

1. **Tutorial Village** - Learn movement, NPC interaction, basic dialogue
2. **Forest Exploration** - Light magic intro, meet first NPCs, encounter animals
3. **Shadow Encounter** - First shadow monster, learn to use torch/light
4. **Graveyard Quest** - Solve puzzles, collect artifacts, mini-game challenge
5. **Castle Challenge** - Boss encounter, inventory management, final showdown
6. **Victory/Epilogue** - Story conclusion, reward system

**For each scenario:**
- Define map layout in MapData JSON
- Place NPCs and set their dialogue (configurable - easy to change)
- Add mini-games (math, trivia, puzzles)
- Set environmental conditions (light level, weather, time of day)

**Starting point:**
- Copy `LumenfallVillageMap.ts` as template
- Create story content in `StoryDatabase.ts`
- Add mini-game questions

### Phase 3: Polish & Testing
- Test sprite rendering at different zoom levels
- Verify shadow/light mechanics work as intended
- Polish UI and make it kid-friendly
- Mobile/tablet optimization
- Performance tuning

---

## Key Files for Content Creation

**Map Definition:**
```typescript
// kids_games/lumenfall/src/phaser/maps/LumenfallVillageMap.ts
// Template for creating new maps
```

**Story/Dialogue:**
```typescript
// kids_games/lumenfall/src/systems/StoryDatabase.ts
// Define all NPC conversations and story branches
```

**Mini-Games:**
```typescript
// kids_games/lumenfall/src/phaser/systems/MathGameSystem.ts
// Add custom mini-game questions here
```

**NPC Definitions:**
```typescript
// kids_games/lumenfall/src/phaser/systems/EntityRegistry.ts
// Add new NPC types or customize existing ones
```

---

## Known Issues & Workarounds

### Asset Quality
Some of the original 1,963 sprite files were generated from problematic atlas sheets. If you see:
- Sprites with pixel-bleeding (colors bleeding from adjacent objects)
- Incorrect crops or strange proportions

**Solution:** Regenerate individual sprites using the AI prompt template in `Lumenfall_Asset_Pipeline_Spec.md`. The spec provides exact canvas sizes and lighting rules.

### Mini-Game Framework
The `MathGameSystem` is a stub - you need to:
1. Add grade 2 math questions (basic addition/subtraction)
2. Add social science questions (local culture, history, community)
3. Define difficulty levels

---

## Commands

**Development:**
```bash
cd kids_games/lumenfall
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

**Testing:**
```bash
npm run test       # Run tests
```

---

## Next Action Items (Priority Order)

1. [ ] Create first scenario map (Tutorial Village)
2. [ ] Write dialogue for NPCs in that scenario
3. [ ] Add 3-5 mini-game questions (math + social science)
4. [ ] Test the complete scenario end-to-end
5. [ ] Create remaining 5 scenarios
6. [ ] Polish UI for kid-friendly experience
7. [ ] Test on mobile/tablet
8. [ ] Final QA and bug fixes

---

## Budget & Scope

- **Total sprites available:** 1,963 individual files
- **Scenarios to create:** 6
- **NPCs needed:** ~10-15 unique characters (can reuse models)
- **Mini-games:** Math + Social Science questions
- **Build time:** Phase 2 (content) and Phase 3 (polish) estimated 2-4 weeks depending on scope

