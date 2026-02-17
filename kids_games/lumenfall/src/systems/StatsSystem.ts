import type { CommandQueue } from '../app/Commands';
import type { DraftTx } from '../state/StateStore';
import type { GameState } from '../state/StateTypes';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const toInt = (value: number): number => Math.max(0, Math.floor(value));

export const canSpendSP = (state: Readonly<GameState>, amount: number): boolean => {
  const amt = toInt(amount);
  return state.runtime.player.sp >= amt;
};

export const spendSP = (tx: DraftTx, amount: number, _reason: string): boolean => {
  const amt = toInt(amount);
  tx.touchRuntimePlayer();
  const draft = tx.draftState;

  if (draft.runtime.player.sp < amt) {
    return false;
  }

  draft.runtime.player.sp = clamp(draft.runtime.player.sp - amt, 0, draft.global.player.maxSP);
  return true;
};

export const restoreSP = (tx: DraftTx, amount: number): void => {
  const amt = toInt(amount);
  tx.touchRuntimePlayer();
  const draft = tx.draftState;
  draft.runtime.player.sp = clamp(draft.runtime.player.sp + amt, 0, draft.global.player.maxSP);
};

export const heal = (tx: DraftTx, amount: number): void => {
  const amt = toInt(amount);
  tx.touchRuntimePlayer();
  const draft = tx.draftState;
  draft.runtime.player.hp = clamp(draft.runtime.player.hp + amt, 0, draft.global.player.maxHP);
};

export const damage = (
  tx: DraftTx,
  amount: number,
  _source: string,
  opts?: { commandQueue?: CommandQueue },
): void => {
  const amt = toInt(amount);
  tx.touchRuntimePlayer();
  const draft = tx.draftState;
  const maxHP = draft.global.player.maxHP;
  const currentHP = clamp(draft.runtime.player.hp, 0, maxHP);

  let appliedDamage = amt;
  if (currentHP === maxHP && appliedDamage >= maxHP) {
    appliedDamage = maxHP - 1;
  }

  const nextHP = clamp(currentHP - appliedDamage, 0, maxHP);
  draft.runtime.player.hp = nextHP;

  if (nextHP === 0) {
    opts?.commandQueue?.enqueue({ kind: 'TriggerFaint' });
  }
};
