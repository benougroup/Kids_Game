import type { EventBus } from '../app/EventBus';
import type { DraftTx } from '../state/StateStore';
import { inventorySystem, type InventoryScope } from './InventorySystem';

import type { ItemDef } from './ItemDatabase';
type EffectOp = NonNullable<ItemDef['effects']>[number];

export class EffectInterpreter {
  constructor(private readonly bus: EventBus) {}

  applyEffects(tx: DraftTx, effects: EffectOp[] = [], context: { scope?: InventoryScope } = {}): { ok: boolean; error?: string } {
    const scope = context.scope ?? 'global';
    const staged: Array<() => void> = [];

    for (const effect of effects) {
      if (effect.op === 'inventory.remove') {
        if (!inventorySystem.hasItem(tx.draftState, effect.itemId, effect.qty, scope)) {
          return { ok: false, error: `Missing ${effect.itemId}` };
        }
        staged.push(() => {
          inventorySystem.removeItem(tx, effect.itemId, effect.qty, scope);
        });
        continue;
      }

      if (effect.op === 'inventory.add') {
        staged.push(() => inventorySystem.addItem(tx, effect.itemId, effect.qty, scope));
        continue;
      }

      if (effect.op === 'hp.delta') {
        staged.push(() => {
          tx.touchRuntimePlayer();
          tx.draftState.runtime.player.hp = Math.max(0, Math.min(tx.draftState.global.player.maxHP, tx.draftState.runtime.player.hp + effect.value));
        });
        continue;
      }

      if (effect.op === 'sp.delta') {
        staged.push(() => {
          tx.touchRuntimePlayer();
          tx.draftState.runtime.player.sp = Math.max(0, Math.min(tx.draftState.global.player.maxSP, tx.draftState.runtime.player.sp + effect.value));
        });
        continue;
      }

      if (effect.op === 'status.add') {
        staged.push(() => {
          tx.touchRuntimePlayer();
          const nowMs = Math.floor(tx.draftState.runtime.time.secondsIntoCycle * 1000);
          tx.draftState.runtime.player.status[effect.statusId] = effect.durationSeconds ? nowMs + effect.durationSeconds * 1000 : true;
        });
        continue;
      }

      if (effect.op === 'ui.message') {
        staged.push(() => {
          tx.touchRuntimeUi();
          tx.draftState.runtime.ui.messages.push(effect.text);
        });
        continue;
      }

      if (effect.op === 'areaEffect.cleanseShadows') {
        staged.push(() => this.bus.emit({ type: 'AREA_EFFECT', kind: 'cleanseShadows', radius: effect.radius, filter: effect.filter ?? 'environmental' }));
      }
    }

    staged.forEach((fn) => fn());
    return { ok: true };
  }
}
