# MODULAR GAME ARCHITECTURE

## Design Principle

**Each scenario is pure DATA, not code.**

Core mechanics are built once, reused everywhere.

---

## What's Reused (Core Mechanics)

These systems exist once in the codebase and work for ALL scenarios:

1. **Day/Night Cycle System**
   - Time progression
   - Light level transitions
   - Shadow spawning/despawning
   - NPC behavior changes (some sleep at night)

2. **Shadow Mechanics**
   - Spawn when darkness increases
   - Flee from light/torches
   - Sleep drains player stamina
   - Different shadow types by darkness level

3. **Rest/Sleep System** (NEW)
   - Player can sleep in safe locations
   - Restores health/stamina
   - Advances time to next day
   - Triggers story events on wake

4. **Environmental Reactions**
   - Creatures react to light
   - NPCs react to time of day
   - Weather affects visibility
   - Locations have hazards/benefits

5. **Trigger System**
   - Area triggers (proximity)
   - Dialogue triggers
   - Item triggers
   - Completion triggers

6. **Quest/Story Flow**
   - Check conditions
   - Execute effects
   - Advance to next scene
   - Same for all scenarios

---

## What's Different (Scenario Data)

Each scenario is ONLY:

```json
{
  "id": "scenario_name",
  "map": {
    "npcs": [ /* NPC placements and movement patterns */ ],
    "creatures": [ /* Animal/monster placements */ ],
    "props": [ /* Environmental objects */ ],
    "triggers": [ /* Area and event triggers */ ]
  },
  "story": {
    "startScene": "scene_id",
    "scenes": [ /* Dialogue trees */ ]
  },
  "conditions": {
    "startRequires": [ /* Prerequisites */ ],
    "endTrigger": "condition",
    "nextScenario": "scenario_id"
  }
}
```

---

## Modular Systems to Build

### 1. Day/Night Cycle System

```typescript
// Core mechanics (one copy for entire game)
class DayNightSystem {
  time: number = 0.3;  // 0-1 (0=midnight, 0.5=noon)
  timeSpeed: number = 0.000033;  // Adjustable
  
  getTimeOfDay(): 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
  getLightLevel(): number  // 0-1, affects shadows
  isNight(): boolean
  isSafeForPlayer(): boolean  // No shadows spawning
  
  onTimeChanged(callback) // Trigger on hour changes
  skipToTime(hour: number)  // For sleep/fast travel
  advanceTime(hours: number)  // For story progression
}
```

**Scenarios only specify:**
- Where player can sleep
- When story events occur (time-based)
- How creatures behave at different times

### 2. Shadow Mechanics System

```typescript
// Core mechanics
class ShadowSystem {
  spawnShadowsAt(lightLevel: number)
  shadowsFleeFrom(torchPosition)
  shadowsDamagePlayer(contact)
  shadowsAvoidLight(lightRadius)
  
  onLightLevelChanged(level: number)
  setShadowBehavior(type: 'aggressive' | 'passive' | 'hunting')
}
```

**Scenarios only specify:**
- Shadow encounter locations
- Story triggers when shadows appear
- Dialogue about shadows

### 3. Rest/Sleep System (NEW)

```typescript
// Core mechanics
class RestSystem {
  canSleepHere(location): boolean
  startRest(duration: 'short' | 'long')
  onWakeUp(callback)
  
  restoreHealth(amount)
  restoreStamina(amount)
  advanceTime(hours)
}
```

**Scenarios specify:**
- Safe rest locations
- What happens when player wakes
- Story progression on rest

### 4. Environmental Reaction System

```typescript
// Core mechanics
class EnvironmentSystem {
  addLocationEffect(location, effect)
  getEffectAt(position): Effect
  creatures.react(toEnvironment)
  npcs.changeRoutineFor(timeOfDay)
  
  Effects: 'healing', 'damage', 'slow', 'poison', 'fire'
}
```

**Scenarios specify:**
- Location effects (healing spot, hazard, etc.)
- NPC daily routines
- Creature spawn zones

### 5. Trigger System

```typescript
// Core mechanics
class TriggerSystem {
  addAreaTrigger(x, y, width, height, onEnter, onExit)
  addTimeTrigger(time, callback)
  addDialogueTrigger(dialogueKey, callback)
  addCompletionTrigger(questId, callback)
  
  checkTriggers()
  executeTrigger(trigger)
}
```

**Scenarios specify:**
- Trigger locations
- What triggers what
- Story progression via triggers

---

## Example Scenario Structure

```typescript
// Scenario 1: Tutorial Village (DATA ONLY - no code)
export const TUTORIAL_VILLAGE = {
  id: 'tutorial_village',
  map: {
    npcs: [
      { id: 'guard', x: 9, y: 6, routine: 'stationary' },
      { id: 'apprentice', x: 3, y: 10, routine: 'wander', radius: 3 },
      { id: 'scholar', x: 16, y: 11, routine: 'stationary' }
    ],
    creatures: [
      { type: 'rabbit', x: 2, y: 2, behavior: 'wander' },
      // ... more animals
    ],
    props: [ /* building and decoration placements */ ],
    triggers: [
      {
        type: 'area',
        x: 0, y: 0, w: 20, h: 15,
        onEnter: 'story:tutorial_village_start',
        onExit: 'story:tutorial_village_end'
      }
    ]
  },
  story: {
    startScene: 'tutorial_guard_aldric_start',
    scenesFile: 'tutorial.scenes.json'  // Same format for all scenarios
  },
  conditions: {
    minTimeRequired: 'morning',  // Scenario only during day
    maxTimeRequired: 'evening',
    nextScenarioOn: 'story:forest_gate_reached'
  }
}

// Scenario 2: Forest Exploration (DIFFERENT DATA, SAME SYSTEMS)
export const FOREST_EXPLORATION = {
  id: 'forest_exploration',
  map: {
    npcs: [
      { id: 'ranger', x: 10, y: 5, routine: 'patrol', path: [...] },
      { id: 'hermit', x: 20, y: 15, routine: 'stationary' }
    ],
    creatures: [
      { type: 'wolf', x: 15, y: 8, behavior: 'hunt_at_night' },
      { type: 'rabbit', x: 5, y: 5, behavior: 'wander' }
    ],
    environmentEffects: [
      { location: 'waterfall', effect: 'healing', strength: 0.5 }
    ],
    triggers: [
      {
        type: 'time',
        time: 'night',
        effect: 'spawn_shadows'
      }
    ]
  },
  story: {
    startScene: 'forest_ranger_greeting',
    scenesFile: 'forest.scenes.json'  // Different dialogue
  },
  conditions: {
    requiredStory: 'tutorial_village_complete',
    endOn: 'story:forest_mystery_solved'
  }
}
```

---

## Creative Mechanics Examples

### Sleep System
```
Player finds safe location (tent, house, inn)
→ Can choose "Rest" 
→ Select duration: "Short rest (1 hour)" or "Full sleep (8 hours)"
→ Health/stamina restored proportionally
→ Time advances
→ Story events can trigger on wake (message, NPC visits, etc.)
→ If rested before night: shadows might not spawn
```

### Day/Night Effects
```
MORNING (6am-9am):
- NPCs wake up, open shops
- Shadows all gone
- Creatures calm
- Safe for travel

AFTERNOON (9am-5pm):
- Normal gameplay
- NPCs busy with routines
- Creatures active but peaceful

EVENING (5pm-7pm):
- NPCs close shops, head home
- Shadows START appearing at horizon
- Creatures get nervous

NIGHT (7pm-6am):
- Heavy shadows everywhere
- NPCs in homes (mostly)
- Dangerous creatures active
- Player takes damage from shadows unless
  1. In light (torch/lantern)
  2. In safe building
  3. Using magic shield
```

### Shadow Behavior
```
Shadow Types by Darkness Level:
- 20% dark: Small shadows (rabbits flee)
- 40% dark: Medium shadows (deer flee)
- 60% dark: Large shadows (combat possible)
- 80% dark: Boss shadows (very dangerous)
- 100% dark: Void creatures (avoid at all costs)

Shadow Reactions:
- Fire/torch: Flee immediately
- Light magic: Pause/weaken
- Player attack: Aggressive counter
- Player running: Chase
- Player standing still: Approach slowly
```

### Environmental Reactions
```
WATER:
- Some creatures drink here
- Healing spot if pure
- Damage if corrupted
- Animals congregate

FIRE:
- Shadows cannot cross
- Creatures avoid
- Player can cook food
- Warmth during cold nights

RUINS:
- Shadows spawn here
- NPCs avoid at night
- Treasure/secrets hidden
- Boss spawn location

SACRED GROUND:
- Shadows flee
- Healing location
- Story significance
- Safe haven
```

---

## Benefits of This Architecture

✓ **Add new scenario:** Just create new JSON data file
✓ **Reuse code:** All mechanics work for all scenarios
✓ **Creative variety:** Different story/NPCs/creatures without code duplication
✓ **Easy balancing:** Adjust mechanics in one place, affects all scenarios
✓ **Scalable:** Can build 10+ scenarios with minimal new code
✓ **Maintainable:** Bug fixes in core systems fix all scenarios
✓ **Designer-friendly:** Non-programmers can create scenarios with JSON

---

## Implementation Order

1. **Build core Day/Night system** (already partially done)
2. **Build Rest/Sleep system** (new feature)
3. **Build Shadow behavior system** (enhance existing)
4. **Build Trigger system** (standardize)
5. **Build Environment effects** (new)
6. **Refactor Tutorial Village to use these systems**
7. **Build Scenario 2 using ONLY data**
8. **Verify Scenario 2 works with same code**
9. **Build remaining scenarios (4-6) as pure data**

---

## Code Reuse Example

```typescript
// Same code runs for ALL scenarios
function loadScenario(scenarioData) {
  const map = buildMap(scenarioData.map);
  const npcs = spawnNPCs(scenarioData.map.npcs);
  const creatures = spawnCreatures(scenarioData.map.creatures);
  const triggers = registerTriggers(scenarioData.map.triggers);
  const story = loadStory(scenarioData.story);
  
  applyEnvironmentEffects(scenarioData.map.environmentEffects);
  
  return { map, npcs, creatures, triggers, story };
}

// Called for Tutorial Village
loadScenario(TUTORIAL_VILLAGE);

// Same function, different data
loadScenario(FOREST_EXPLORATION);

// And again for each scenario
loadScenario(SHADOW_ENCOUNTER);
loadScenario(GRAVEYARD_QUEST);
// etc.
```

**One function. Infinite scenarios.**

