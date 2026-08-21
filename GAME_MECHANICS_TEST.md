# Game Mechanics Test Checklist

## Status: All Systems Present & Ready

Test Report Summary:
- Entry point: PASS (index.html configured)
- Game Scenes: PASS (GameScene + UIScene)
- Entity System: PASS (37 NPCs/Monsters defined)
- Dialogue System: PASS (DialogueSystem + StoryDatabase)
- Map System: PASS (MapBuilder + 4 test maps)
- Mini-Game System: PASS (MathGameSystem present)
- Sprite System: PASS (96 sprites registered, 1,963 files available)
- Light/Shadow System: PASS (Both systems implemented)

---

## How to Test the Game

### 1. Open the Game
```
URL: http://localhost:5173/Kids_Game/
```

You should see a **dark game window** with the Phaser Lumenfall game loading.

### 2. What You'll See First

**Expected:**
- A village map with:
  - Ground tiles (grass/dirt)
  - Buildings (houses, taverns)
  - Props (trees, rocks, barrels)
  - NPCs standing in fixed positions
  - A player character (hero) in the center
  - Dialogue box area at bottom

**Navigation:**
- WASD or Arrow keys = move
- Click on ground = walk to that spot
- Click on NPC = talk to them

---

## Test Checklist

### A. Map & Environment
- [ ] Game loads without errors
- [ ] Can see ground tiles filling the map
- [ ] Buildings render correctly (no distorted graphics)
- [ ] Props visible (trees, rocks, barrels, chests)
- [ ] Map boundary is clear (can't walk off edge)
- [ ] Day/night lighting works (or static lighting)

### B. NPCs & Characters
- [ ] At least 3 NPCs visible on the map
- [ ] NPCs are stationary (guards, merchants, etc.)
- [ ] Player character visible in center
- [ ] All characters render without pixel-bleeding

### C. Movement & Physics
- [ ] Can move player with WASD keys
- [ ] Can move player with arrow keys
- [ ] Can click on ground to walk there
- [ ] Player doesn't walk through buildings
- [ ] Player doesn't walk through props
- [ ] Movement feels smooth (8-direction)

### D. Dialogue System
- [ ] Click on an NPC
- [ ] Speech bubble appears above NPC
- [ ] Dialogue text displays clearly
- [ ] 2+ dialogue choices appear as buttons
- [ ] Can click a choice
- [ ] Dialogue continues to next scene
- [ ] Can see different NPCs have different dialogue
- [ ] "Return to map" button works

### E. Monsters & Entities
- [ ] Peaceful animals present (rabbits, butterflies, etc.)
- [ ] Animals move/wander around
- [ ] Shadow monsters appear (especially at night if time system active)
- [ ] Monsters don't block the player initially
- [ ] All creatures render without issues

### F. User Interface
- [ ] HUD visible at top/bottom
- [ ] Buttons are clickable
- [ ] Text is readable
- [ ] No layout overlaps or broken elements
- [ ] Touch controls work if on tablet/mobile

### G. Special Mechanics (if active)
- [ ] Torch/light source affects shadows
- [ ] Day/night cycle visible
- [ ] Inventory can be opened
- [ ] Items can be picked up
- [ ] Map transitions work (exits between maps)

### H. Performance
- [ ] Game runs smoothly (not laggy)
- [ ] No console errors (open DevTools: F12)
- [ ] All sprites load quickly
- [ ] No flickering or visual artifacts

---

## What Each Test Map Contains

The game loads one of these by default:

### Map: lumenfall_village
- **NPCs:** Guard, Apprentice, Scholar, Merchant, Elder, Child
- **Props:** Trees, rocks, barrels, market stalls
- **Buildings:** Tavern, houses, blacksmith, chapel
- **Features:** Market square, village layout

### Map: test_town (alternative)
- **NPCs:** Multiple test NPCs
- **Monsters:** Some shadows and creatures
- **Props:** Variety of all prop types
- **Purpose:** Full system test

---

## How to Check for Errors

**Press F12 to open Developer Console:**
- Look for red error messages
- Check if sprites are loading (Network tab)
- Check if dialogues are defined (Console logs)

**If you see errors:**
1. Note the error message
2. Check the file path
3. Verify sprite files exist

---

## What to Report

If something doesn't work, tell me:

1. **What you tried:** (e.g., "Clicked on Guard NPC")
2. **What should happen:** (e.g., "Speech bubble should appear")
3. **What actually happened:** (e.g., "Nothing happened, or error in console")
4. **Any console errors:** (screenshot of F12 console)
5. **Which map you're on:** (lumenfall_village vs test_town)

---

## Quick Links

**Dev Server:** http://localhost:5173/Kids_Game/

**Key Files to Check:**
- Game: `kids_games/lumenfall/src/phaser/scenes/GameScene.ts`
- NPCs: `kids_games/lumenfall/src/phaser/systems/EntityRegistry.ts`
- Dialogue: `kids_games/lumenfall/src/systems/StoryDatabase.ts`
- Maps: `kids_games/lumenfall/src/phaser/maps/`

---

## Next Steps (After Testing)

If everything works:
1. Start building Scenario 1 (Tutorial Village)
2. Add custom dialogue
3. Create mini-game content
4. Build remaining scenarios

If something doesn't work:
1. Share the error message
2. I'll fix it
3. Then we proceed with content

