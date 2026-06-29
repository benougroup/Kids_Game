import { GAME_MODES } from '../app/ModeMachine';
import type { GameState, InventoryState } from './StateTypes';

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalizeInventory = (inv: InventoryState, scope: string, issues: string[]): void => {
  for (const [itemId, stack] of Object.entries(inv.items)) {
    if (stack.qty < 0) {
      issues.push(`${scope} ${itemId} is negative (${stack.qty})`);
      inv.items[itemId] = { qty: 0 };
    }
  }
};

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

  normalizeInventory(state.global.inventory, 'global.inventory', issues);
  normalizeInventory(state.story.storyInventory, 'story.storyInventory', issues);

  if (!(GAME_MODES as readonly string[]).includes(state.runtime.mode)) {
    issues.push(`runtime.mode invalid (${state.runtime.mode as string})`);
    state.runtime.mode = 'EXPLORE';
  }

  if (issues.length > 0 && isDev) {
    throw new Error(`Invariant violation(s): ${issues.join('; ')}`);
  }
};
