import type { DraftTx } from '../state/StateStore';
import type { GameState, InventoryState } from '../state/StateTypes';
import { itemDatabase, type ItemCategory } from './ItemDatabase';

export type InventoryScope = 'global' | 'story';

const getInventory = (state: Readonly<GameState>, scope: InventoryScope): InventoryState =>
  scope === 'global' ? state.global.inventory : state.story.storyInventory;

export class InventorySystem {
  addItem(tx: DraftTx, itemId: string, qty: number, scope: InventoryScope): boolean {
    const item = itemDatabase.getItem(itemId);
    if (!item) return false;
    if (scope === 'global') tx.touchInventoryGlobal();
    else tx.touchStoryInventory();
    tx.touchRuntimeUi();
    const inv = getInventory(tx.draftState, scope);

    if (!item.stackable) {
      inv.nonStack[itemId] = true;
      return true;
    }

    const current = inv.items[itemId]?.qty ?? 0;
    const max = item.maxStack ?? Number.MAX_SAFE_INTEGER;
    const next = Math.min(max, current + Math.max(0, Math.floor(qty)));
    inv.items[itemId] = { qty: next };
    if (next < current + qty) {
      tx.draftState.runtime.ui.messages.push('Bag is full for this item.');
    }
    return true;
  }

  removeItem(tx: DraftTx, itemId: string, qty: number, scope: InventoryScope): boolean {
    const item = itemDatabase.getItem(itemId);
    if (!item) return false;
    if (scope === 'global') tx.touchInventoryGlobal();
    else tx.touchStoryInventory();
    const inv = getInventory(tx.draftState, scope);
    const amount = Math.max(0, Math.floor(qty));

    if (!item.stackable) {
      if (!inv.nonStack[itemId]) return false;
      delete inv.nonStack[itemId];
      return true;
    }

    const current = inv.items[itemId]?.qty ?? 0;
    if (current < amount) return false;
    const next = current - amount;
    if (next <= 0) delete inv.items[itemId];
    else inv.items[itemId] = { qty: next };
    return true;
  }

  hasItem(state: Readonly<GameState>, itemId: string, qty: number, scope: InventoryScope): boolean {
    return this.getQty(state, itemId, scope) >= Math.max(0, Math.floor(qty));
  }

  getQty(state: Readonly<GameState>, itemId: string, scope: InventoryScope): number {
    const item = itemDatabase.getItem(itemId);
    if (!item) return 0;
    const inv = getInventory(state, scope);
    if (!item.stackable) return inv.nonStack[itemId] ? 1 : 0;
    return inv.items[itemId]?.qty ?? 0;
  }

  getItemsByCategory(state: Readonly<GameState>, scope: InventoryScope, category: ItemCategory | 'all'): Array<{ itemId: string; qty: number }> {
    return itemDatabase
      .listByCategory(category)
      .map((item) => ({ itemId: item.id, qty: this.getQty(state, item.id, scope) }))
      .filter((entry) => entry.qty > 0);
  }
}

export const inventorySystem = new InventorySystem();
