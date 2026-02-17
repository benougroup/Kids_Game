import { GAME_MODES } from '../app/ModeMachine';
import type { GameState } from './StateTypes';

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const validateInvariants = (state: GameState): void => {
  const issues: string[] = [];

  const maxHP = state.global.player.maxHP;
  const maxSP = state.global.player.maxSP;

  const nextHP = clamp(state.runtime.player.hp, 0, maxHP);
  if (nextHP !== state.runtime.player.hp) {
    issues.push(`runtime.player.hp out of bounds: ${state.runtime.player.hp}`);
    state.runtime.player.hp = nextHP;
  }

  const nextSP = clamp(state.runtime.player.sp, 0, maxSP);
  if (nextSP !== state.runtime.player.sp) {
    issues.push(`runtime.player.sp out of bounds: ${state.runtime.player.sp}`);
    state.runtime.player.sp = nextSP;
  }

  for (const [itemId, qty] of Object.entries(state.global.inventory)) {
    if (qty < 0) {
      issues.push(`global.inventory ${itemId} is negative (${qty})`);
      state.global.inventory[itemId] = 0;
    }
  }

  for (const [itemId, qty] of Object.entries(state.story.storyInventory)) {
    if (qty < 0) {
      issues.push(`story.storyInventory ${itemId} is negative (${qty})`);
      state.story.storyInventory[itemId] = 0;
    }
  }

  if (!(GAME_MODES as readonly string[]).includes(state.runtime.mode)) {
    issues.push(`runtime.mode invalid (${state.runtime.mode as string})`);
    state.runtime.mode = 'EXPLORE';
  }

  if (issues.length > 0 && isDev) {
    throw new Error(`Invariant violation(s): ${issues.join('; ')}`);
  }
};
