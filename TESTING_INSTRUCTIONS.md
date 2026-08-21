# GAME TESTING GUIDE - What You'll See

## The Game Should Load Instantly

**URL:** http://localhost:5173/Kids_Game/

**Expected:**
- Brown/green landscape
- A character (player) in the middle
- Buildings and trees
- Various NPCs and animals walking around
- Dialogue box at the bottom ready for interaction

---

## What's Currently In The Test Maps

### THE LUMENFALL VILLAGE (Starts Here)
A village with:

**NPCs You Can Talk To:**
- Guard Aldric (entrance)
- Apprentice Mira (magic shop area)
- Scholar Vera (knowledge keeper)
- Merchant Brom (trading)
- Elder Theron (wisdom)
- Child Pip (youth)

**Buildings:**
- Tavern (center)
- Magic shop
- Market stall
- Houses
- Chapel

**Animals (Peaceful - Will Run Away):**
- Rabbits (multiple scattered)
- Squirrels (jumping around)
- Frogs (near water)
- Butterflies (flying)
- Hedgehogs (slow movers)
- Slimes (green, blue, red varieties)

**What To Do:**
1. Move around with WASD or arrow keys
2. Click on an NPC - speech bubble appears
3. Read dialogue and click choices
4. Watch animals run away as you approach
5. Explore the entire map

---

## Specific Tests To Run

### Test 1: Movement
```
Do this:
1. Press 'W' - player moves up
2. Press 'A' - player moves left
3. Press 'D' - player moves right
4. Press 'S' - player moves down
5. Hold multiple keys - diagonal movement

Expected: Smooth 8-direction movement, no lag
```

### Test 2: Click-to-Move
```
Do this:
1. Click on empty ground in the distance
2. Player walks to that spot

Expected: Path shows, player walks smoothly
```

### Test 3: NPC Dialogue
```
Do this:
1. Click on Guard Aldric (tall figure by entrance)
2. Wait for speech bubble

Expected:
- Speech bubble appears above guard
- Guard's name shown
- Dialogue text visible
- 2-3 choice buttons appear
```

### Test 4: Make Dialogue Choice
```
Do this:
1. After dialogue appears, click one of the choice buttons

Expected:
- That choice is selected
- Dialogue changes to next scene
- New choices appear (or "Return to Map" appears)
```

### Test 5: Animal Interaction
```
Do this:
1. Locate a rabbit or butterfly
2. Walk toward it slowly

Expected:
- Animal notices you
- Animal runs/flies away
- Animal has animation
```

### Test 6: Sprite Quality
```
Look at:
1. Trees - should look detailed, no pixel bleeding
2. Barrels - round shape, no distortion
3. Buildings - clear edges, proper perspective
4. NPCs - clear character models

Expected: All clean, professional-looking pixel art
```

### Test 7: No Clipping
```
Do this:
1. Try walking through a tree
2. Try walking through a building
3. Try walking through a barrel

Expected: Can't pass through - collision working
```

---

## Console Check (Press F12)

**Look for:**
- ✓ NO red error messages = good
- ✓ Network tab shows sprites loading
- ✓ Console shows "preload" messages

**If errors appear:**
- Take a screenshot
- Note the error message
- Tell me what it says

---

## Performance Check

**Watch for:**
- Smooth animation (no stuttering)
- No lag when moving around
- Dialogue appears instantly when clicking NPC
- Animals move smoothly

**If problems:**
- Game too slow? Tell me FPS is low
- Freezing? Tell me when it freezes
- Glitchy sprites? Tell me which sprite and where

---

## Checklist Summary

Print this and check off as you test:

```
CORE SYSTEMS
[ ] Game loads without crashing
[ ] Can see the map and environment
[ ] Player character visible
[ ] NPCs visible (at least 3)
[ ] Animals visible (rabbits, butterflies, etc.)

MOVEMENT
[ ] WASD keys move player
[ ] Arrow keys work
[ ] Diagonal movement works
[ ] Click-to-move works
[ ] Can't walk through buildings
[ ] Can't walk through trees

GRAPHICS
[ ] Trees look good (no pixel bleeding)
[ ] Buildings clear and detailed
[ ] Characters render cleanly
[ ] Animals look distinct
[ ] Props are visible and properly placed

INTERACTION
[ ] Can click on NPC
[ ] Speech bubble appears
[ ] Dialogue text is readable
[ ] Can click dialogue choices
[ ] Different NPCs have different dialogue
[ ] Animals run away when approached

UI/CONTROLS
[ ] Buttons are clickable
[ ] Text is readable
[ ] No layout issues
[ ] Touch controls work (if on tablet)

PERFORMANCE
[ ] Smooth movement (no lag)
[ ] No stuttering
[ ] No console errors
[ ] Game runs at good FPS
```

---

## What NOT to Expect Yet

These aren't built yet (we'll build them in Phase 2):
- ✗ Tutorial/on-screen instructions
- ✗ Mini-games
- ✗ Inventory system
- ✗ Combat/attack system
- ✗ Quest log
- ✗ Story progression
- ✗ Save/load game

---

## If Something's Broken

**Tell me:**
1. What you tried to do
2. What happened instead
3. Any error messages (F12 console)
4. Which map you're on (lumenfall_village, test_town)

**Example:**
> "I clicked on Guard Aldric but nothing happened. Console shows: 'Cannot read property dialogueKey of undefined'"

---

## Next Action

Once you verify everything works:

1. Send me a report (✓ working or ✗ broken items)
2. I'll fix any issues
3. We start building Scenario 1 (Tutorial Village)
4. Your kid can start playing and exploring

**Start testing now!**
Go to: http://localhost:5173/Kids_Game/

