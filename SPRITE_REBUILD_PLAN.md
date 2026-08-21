# SPRITE SYSTEM REBUILD - START FROM ZERO

## Core Problems Identified

1. **Duplicate sprites** - Same image repeated in atlas/files
2. **Wrong canvas sizes** - Sprites cropped incorrectly (width too wide)
3. **Background color issues** - Wrong transparency/alpha channel
4. **Missing sprites** - Grass, roads, backgrounds removed or broken
5. **Asset generation errors** - Previous AI created bad sprite sheets

## New Strategy: Verification First

Before building anything new, we need to:

### Phase 1: Audit & Verify (NO coding)
1. Check what sprite files actually exist
2. Verify they have correct:
   - Canvas size
   - Transparent backgrounds
   - No duplication
   - Proper cropping
3. Document good vs broken sprites

### Phase 2: Clean Up
1. Remove all broken/duplicate sprites
2. Keep only verified working sprites
3. Create minimal sprite list

### Phase 3: Rebuild Sprite System (Simple)
1. Load only verified sprites
2. Use simple positioning (no complex logic)
3. Test each sprite individually
4. Build from known-good foundation

---

## What We'll Do NOW

**Step 1: Create Sprite Audit Script**
- Check each sprite file
- Verify dimensions
- List duplicates
- Identify missing backgrounds

**Step 2: Create Minimal Test Scene**
- Load ONE sprite (rabbit)
- Display it correctly
- Verify positioning
- Then add second sprite

**Step 3: Document Good Sprites**
- Only sprites that work
- Their correct canvas sizes
- Their correct positioning

**Step 4: Rebuild Map System**
- Use only verified sprites
- Simple 1:1 sprite to file mapping
- No complex logic

---

## What We're NOT Doing

✗ Trying to fix broken sprites
✗ Using atlas files with duplicates
✗ Complex positioning logic
✗ Creature animation frames (too broken)
✗ Anything except sprite display verification

---

## Focus: Sprite Size Verification

For each sprite type, we need to know:

```
Sprite ID: rabbit_idle
File: assets/sprites/creatures/animals_peaceful/rabbit/idle_f01.png
Canvas Size: ?×? (need to verify)
Background: Transparent? (need to verify)
Duplicates: Yes/No
Status: Working/Broken
```

---

## Next Action

Let me create a diagnostic tool that:
1. Lists all sprite files
2. Checks their actual dimensions
3. Identifies duplicates
4. Creates a verified sprite registry

Then we'll rebuild with ONLY working sprites.

---

## Expected Result

After rebuild:
- ✓ Grass visible (if file exists and is good)
- ✓ Roads visible (if file exists and is good)
- ✓ Buildings correct (if file exists and is good)
- ✓ No black boxes (only valid sprites)
- ✓ No duplicates (cleaned up)
- ✓ Correct positioning (simple logic)

But ONLY sprites that actually work.

---

## Token Strategy

We're stopping all rebuilding/recoding until we have:
1. Verified good sprite list
2. Confirmed canvas sizes
3. Confirmed transparency
4. Confirmed no duplicates

This prevents wasting tokens on fixing broken assets.

Ready to audit sprites?
