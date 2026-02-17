import type { GameState } from '../state/StateTypes';
import { inventorySystem } from './InventorySystem';
import type { SceneConditions } from './SceneDatabase';

export const evaluateSceneConditions = (state: Readonly<GameState>, conditions?: SceneConditions): boolean => {
  if (!conditions) return true;

  if (conditions.flags) {
    for (const [key, value] of Object.entries(conditions.flags)) {
      if (state.story.flags[key] !== value) return false;
    }
  }

  if (conditions.notFlags) {
    for (const [key, value] of Object.entries(conditions.notFlags)) {
      if (state.story.flags[key] === value) return false;
    }
  }

  if (conditions.hasItem) {
    if (!inventorySystem.hasItem(state, conditions.hasItem.itemId, conditions.hasItem.qty, conditions.hasItem.scope)) return false;
  }

  if (typeof conditions.minSP === 'number' && state.runtime.player.sp < conditions.minSP) return false;
  if (typeof conditions.minHP === 'number' && state.runtime.player.hp < conditions.minHP) return false;

  if (conditions.timePhaseIn && !conditions.timePhaseIn.includes(state.runtime.time.phase)) return false;

  if (conditions.trustAtLeast) {
    const trust = state.story.npc.trust[conditions.trustAtLeast.npcId] ?? 0;
    if (trust < conditions.trustAtLeast.value) return false;
  }

  return true;
};
