# SCENARIO 1 READY: Tutorial Village

## What's New

**The first playable scenario is complete!**

Your kid can now:
- Explore a friendly village
- Talk to 3 NPCs with multiple dialogue branches
- Learn the story (light magic vs shadows)
- Discover the main quest
- Interact with peaceful animals
- Make meaningful dialogue choices

---

## Test It Now

**URL:** http://localhost:5173/Kids_Game/

The game will load **Tutorial Village** automatically.

---

## What Your Kid Will See

### The Village
- Safe, bright, welcoming setting
- Tavern in the center (Guard Aldric here)
- Houses on left and right
- Trees and bushes for exploration
- Dirt paths connecting buildings

### NPCs (Click to Talk)
1. **Guard Aldric** (tavern center)
   - Introduces the main quest
   - Talks about shadows and light
   - Multiple conversation paths

2. **Mira the Apprentice** (right house)
   - Teaches light magic basics
   - Explains how to use torches
   - Offers multiple ways to continue

3. **Scholar Vera** (right house)
   - Shares ancient knowledge
   - Explains shadow mechanics
   - Provides wisdom and guidance

### Animals to Discover
- Rabbits (will run away)
- Butterflies (will flee)
- Squirrel (will scatter)
- All have animations and behavior

---

## Dialogue Features

### Multiple Dialogue Paths
Each NPC has 3-6 different conversation options. Players can:
- Ask different questions
- Get different responses
- Make different choices
- Return and talk again

### Example with Guard Aldric:
```
Guard: "Welcome to Lumenfall Village!"
Player chooses:
  A) "I want to help!"
  B) "I'm just exploring"
  C) "Who are you?"

Each choice leads to different conversations...
```

### Dialogue Choices
- "A) Option Text" - click to select
- Dialog continues based on choice
- Some conversations lead to "Return to Map"
- Can talk to NPCs multiple times

---

## Full Dialogue Map

### Guard Aldric (6 scenes)
- Welcome & introduction
- Interested path (learns about quest)
- Casual path (just exploring)
- Who are you? path (learns about guard)
- Light magic explanation
- Full mission briefing

### Mira the Apprentice (8 scenes)
- Welcome & offer to teach
- Light magic lesson
- What is light magic?
- How to use the power
- Are shadows dangerous?
- Where is the scholar?
- Learning complete acknowledgment

### Scholar Vera (8 scenes)
- Greetings & knowledge keeper
- Shadow explanations
- How to help the village
- What is your role?
- How to get a torch
- Full quest briefing
- Knowledge and wisdom

**Total: 16 unique dialogue scenes with branching paths**

---

## Testing Checklist

```
MAP & ENVIRONMENT
[ ] Village loads without errors
[ ] Can see buildings, trees, props
[ ] Sprites render cleanly
[ ] Layout makes sense

NPCS
[ ] 3 NPCs visible in correct positions
[ ] Guard at tavern center
[ ] Mira at right house
[ ] Scholar at right house

DIALOGUE
[ ] Can click on Guard Aldric
[ ] Speech bubble appears
[ ] Dialogue text is readable
[ ] Multiple choices appear
[ ] Can click different choices
[ ] Dialogue changes based on choice
[ ] Can talk to NPCs multiple times

ANIMALS
[ ] See rabbits moving around
[ ] See butterflies flying
[ ] See squirrel hopping
[ ] Animals run away when approached
[ ] Each has different animation

CHOICES & BRANCHING
[ ] Different paths lead to different conversations
[ ] Some paths lead back to map
[ ] Some paths continue to more dialogue
[ ] No dead ends (can always continue)

STORY UNDERSTANDING
[ ] Kid learns about shadows
[ ] Kid learns about light magic
[ ] Kid learns a quest is available
[ ] Kid wants to continue to next area

PERFORMANCE
[ ] Game runs smoothly
[ ] No lag during movement
[ ] Dialogue appears instantly
[ ] No console errors (F12)
```

---

## What to Look For

**Good Signs:**
- Kid is curious and wants to talk to all NPCs
- Kid explores the entire village
- Kid tries different dialogue choices
- Kid watches animals and enjoys interaction
- Kid asks what happens next

**Red Flags:**
- Dialogue doesn't appear
- NPCs are in wrong places
- Animals don't move
- Sprites look distorted
- Game is slow/laggy

---

## If Something's Wrong

**Check these:**
1. Is the dev server running? (`npm run dev`)
2. Are you at http://localhost:5173/Kids_Game/ ?
3. Press F12 - any red errors in console?
4. Is JavaScript enabled in browser?
5. Try refreshing the page

**Report what you see:**
- "Clicked on Guard but nothing happened"
- "Text is too small to read"
- "NPC is in wrong place"
- "Animal animations look weird"

---

## Next Steps

After testing, report:
1. What works great (let me know what your kid liked!)
2. What needs fixing (any bugs or issues)
3. Ideas for improvement (anything you want to change?)

Then we move to **Scenario 2: Forest Exploration**

---

## Current Map Stats

**Tutorial Village**
- Size: 20x15 tiles (1,280 x 960 pixels)
- NPCs: 3 (Guard, Apprentice, Scholar)
- Animals: 6 (2 rabbits, 2 butterflies, 1 squirrel, 1 extra rabbit)
- Buildings: 3 (Tavern, 2 Houses)
- Props: 5 (Trees, bushes, barrels)
- Dialogue Nodes: 16 with branching paths
- Exit: North to Forest (not yet built)

---

## Quick Commands

```bash
# Reload the game
- Refresh browser (F5 or Cmd+R)

# See debug info
- Press F12 (Developer Console)
- Check Network tab for assets
- Check Console for errors

# Test different maps (advanced)
- In dev console: lumenfall.loadMap('lumenfall_village', 14, 12)
- In dev console: lumenfall.loadMap('test_town', 14, 12)
```

---

## Have Fun!

Your kid is now in the Lumenfall world. Let me know what she thinks!

