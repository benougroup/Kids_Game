import { CheckpointSystem } from './CheckpointSystem';
import { inventorySystem } from './InventorySystem';
import { itemDatabase } from './ItemDatabase';
import { recipeDatabase } from './RecipeDatabase';
import type { DraftTx } from '../state/StateStore';

export class CraftingSystem {
  constructor(private readonly checkpointSystem: CheckpointSystem) {}

  open(tx: DraftTx, mixingTableId: string): void {
    tx.touchRuntime();
    tx.touchRuntimeTime();
    tx.touchRuntimeCrafting();
    tx.draftState.runtime.mode = 'CRAFTING';
    tx.draftState.runtime.time.paused = true;
    tx.draftState.runtime.crafting = { open: true, mixingTableId };
  }

  close(tx: DraftTx): void {
    tx.touchRuntime();
    tx.touchRuntimeTime();
    tx.touchRuntimeCrafting();
    tx.draftState.runtime.mode = 'EXPLORE';
    tx.draftState.runtime.time.paused = false;
    tx.draftState.runtime.crafting.open = false;
  }

  setSlot(tx: DraftTx, slot: 'A' | 'B', itemId: string): void {
    tx.touchRuntimeCrafting();
    if (slot === 'A') tx.draftState.runtime.crafting.slotA = itemId;
    else tx.draftState.runtime.crafting.slotB = itemId;
  }

  mix(tx: DraftTx): void {
    tx.touchRuntimeCrafting();
    tx.touchRuntimeUi();
    const { slotA, slotB } = tx.draftState.runtime.crafting;
    if (!slotA || !slotB) {
      tx.draftState.runtime.ui.messages.push('Pick two ingredients.');
      return;
    }
    if (!inventorySystem.hasItem(tx.draftState, slotA, 1, 'global') || !inventorySystem.hasItem(tx.draftState, slotB, 1, 'global')) {
      tx.draftState.runtime.ui.messages.push('Need those ingredients in your bag.');
      return;
    }

    const recipe = recipeDatabase.match([slotA, slotB]);
    if (!recipe) {
      const text = 'That mix makes a sleepy puff! Try a different pair.';
      tx.draftState.runtime.crafting.lastResult = { ok: false, text };
      tx.draftState.runtime.ui.messages.push(text);
      return;
    }

    inventorySystem.removeItem(tx, slotA, 1, 'global');
    inventorySystem.removeItem(tx, slotB, 1, 'global');
    inventorySystem.addItem(tx, recipe.outputItemId, 1, 'global');

    const output = itemDatabase.getItem(recipe.outputItemId);
    const text = `You made: ${output?.name ?? recipe.outputItemId}!`;
    tx.draftState.runtime.crafting.lastResult = { ok: true, text };
    tx.draftState.runtime.ui.messages.push(text);
    this.checkpointSystem.setCheckpoint(tx, `mix_${tx.draftState.runtime.map.currentMapId}_${tx.draftState.runtime.player.x}_${tx.draftState.runtime.player.y}`);
    this.checkpointSystem.snapshot(tx);
  }
}
