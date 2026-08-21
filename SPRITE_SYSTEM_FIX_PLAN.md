# COMPREHENSIVE SPRITE SYSTEM FIX PLAN

## Current Status

### What's Working ✓
- Buildings: 27 registered, all loaded (100%)
- Props Large: 20 registered, all loaded (100%)
- Props Medium: 31 registered, all loaded (100%)
- Props Small: 16 registered, all loaded (100%)
- **Total Props Working: 94 sprites**

### What's Broken ✗
- Characters: 527 PNG files exist, but using atlas instead of individual files
- Creatures: 806 animation frames exist, but:
  - Only 18 creatures mapped in CreatureAssets
  - 37 creatures defined in EntityRegistry
  - Many creatures using placeholder/wrong frames
  - Missing transparency handling

---

## The Core Problem

**Sizing Inconsistency Across Categories:**

| Category | Canvas Size | Files | Registered | Status |
|----------|------------|-------|-----------|--------|
| Buildings | 256×256 (or 384×384) | 27 | 27 | ✓ Working |
| Props Large | 128×192 | 20 | 20 | ✓ Working |
| Props Medium | 64×64 | 31 | 31 | ✓ Working |
| Props Small | 32×48 | 16 | 16 | ✓ Working |
| Characters | Variable | 527 | 0 (using atlas) | ✗ Not optimal |
| Creatures | Variable | 806 (frames) | 18/37 | ✗ Broken |

---

## Fix Strategy (Phased Approach)

### Phase 1: Establish Sprite Sizing Standards (TODAY)
Create definitive sizing rules for all sprite categories:
- Characters (player, NPCs): 48×48 display size
- Creatures: Variable by type (see below)
- Buildings: Consistent 256×256 or 384×384
- Props: Follow spec (128×192, 64×64, 32×48)

### Phase 2: Fix Creature System (TODAY)
1. Map all 37 creatures to available animation frames
2. Set correct display sizes for each creature type
3. Ensure transparency/alpha handling
4. Remove placeholder frame references

### Phase 3: Standardize Display Sizes (TODAY)
Update all sprite rendering to use consistent sizing:
- Small creatures (rabbit, squirrel, frog, butterfly): 20-32px
- Medium creatures (slime, spider): 36-42px
- Large creatures (wolf, troll, boss): 48-58px
- Buildings: 256px (standard) or 384px (large)
- Props: Match canvas size exactly

### Phase 4: Test All Sprites (TODAY)
Create test map with all working sprites to verify sizing

---

## Creature Sizing Reference

### Small Peaceful Animals (20-28px)
- Rabbit: 24px ✓
- Squirrel: 22px
- Frog: 20px
- Butterfly: 20px
- Bird: 24px
- Hedgehog: 22px

### Medium Creatures (32-44px)
- Slime (all variants): 28-32px ✓
- Spider: 36px
- Giant Bug: 38px
- Skeleton: 44px

### Large Creatures (48-58px)
- Wolf: 42px ✓
- Boar: 36px
- Troll: 52px
- Golem: 58px ✓
- Shadow Boss: 56px

### Special (Flying/Ethereal) (32-40px)
- Ghost: 40px
- Shadow Wraith: 32px
- Void Creature: 40px
- Dark Knight (boss): 56px

---

## Implementation Steps

### Step 1: Create Master Sizing Table
Document exact display size for each creature by ID

### Step 2: Update EntityRegistry
- Fix all creature frame definitions
- Set correct displaySize for each creature
- Remove placeholder frames

### Step 3: Update CreatureAssets
- Map all 37 creatures to actual frame paths
- Ensure all required animation frames exist

### Step 4: Fix MapBuilder
- Ensure pixelWidth/pixelHeight always set
- Use displaySize from EntityRegistry
- Validate sizing before rendering

### Step 5: Test Map
- Create map with all 37 creatures
- Verify sizing consistency
- Check transparency/rendering

---

## Files to Modify

1. **EntityRegistry.ts**
   - Fix displaySize for all 37 creatures
   - Fix frame definitions
   - Remove placeholders

2. **CreatureAssets.ts**
   - Map all creatures to actual frames
   - Add missing creature mappings

3. **TutorialVillageMap.ts & others**
   - Ensure all use proper sizing
   - Test with fixed creatures

4. **MapBuilder.ts** (if needed)
   - Verify sprite rendering handles all sizes

---

## Expected Results After Fix

✓ All 94 prop sprites render correctly
✓ All 27 buildings consistent size
✓ All 37 creatures proper size and transparency
✓ No black boxes or stretching
✓ Professional visual consistency
✓ Ready for scenario building

---

## Deliverables

1. **Master Sprite Sizing Document**
   - Every sprite with correct display size
   - Canvas size for each category
   - Transparency handling notes

2. **Fixed EntityRegistry**
   - All 37 creatures properly defined
   - Correct frame mappings
   - Proper display sizes

3. **Fixed CreatureAssets**
   - All creatures mapped to frames
   - Complete loose frame system

4. **Test Verification**
   - All sprites render correctly
   - No visual artifacts
   - Professional appearance

---

## Estimated Time

- Create sizing spec: 15 min
- Fix EntityRegistry: 30 min
- Fix CreatureAssets: 20 min
- Create test map: 15 min
- Testing & verification: 20 min

**Total: ~1.5 hours to complete all fixes**

---

## Next: Start Phase 1 - Create Master Sizing Spec

Ready to proceed with comprehensive sprite system fix?

