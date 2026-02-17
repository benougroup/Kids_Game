import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/state/StateTypes';
import { StateStore } from '../src/state/StateStore';
import { inventorySystem } from '../src/systems/InventorySystem';
import { itemDatabase } from '../src/systems/ItemDatabase';
import { EffectInterpreter } from '../src/systems/EffectInterpreter';
import { EventBus } from '../src/app/EventBus';
import { CheckpointSystem } from '../src/systems/CheckpointSystem';
import { CraftingSystem } from '../src/systems/CraftingSystem';

describe('InventorySystem', () => {
  it('supports add/remove without negative qty', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('stacking');
    inventorySystem.addItem(tx, 'ingredient_sunleaf', 3, 'global');
    expect(inventorySystem.removeItem(tx, 'ingredient_sunleaf', 2, 'global')).toBe(true);
    expect(inventorySystem.removeItem(tx, 'ingredient_sunleaf', 5, 'global')).toBe(false);
    store.commitTx(tx);
    expect(store.get().global.inventory.items['ingredient_sunleaf'].qty).toBe(1);
  });

  it('clamps maxStack and pushes bag full message', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('maxstack');
    inventorySystem.addItem(tx, 'potion_glowbomb', 99, 'global');
    store.commitTx(tx);
    expect(store.get().global.inventory.items['potion_glowbomb'].qty).toBe(itemDatabase.getItem('potion_glowbomb')?.maxStack);
    expect(store.get().runtime.ui.messages.at(-1)).toBe('Bag is full for this item.');
  });
});

describe('Effects + Crafting', () => {
  it('using potion clamps hp/sp', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('use_potion');
    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.hp = 5;
    tx.draftState.runtime.player.sp = 3;
    const interpreter = new EffectInterpreter(new EventBus());
    interpreter.applyEffects(tx, itemDatabase.getItem('potion_small_cocoa')?.effects);
    interpreter.applyEffects(tx, itemDatabase.getItem('potion_glow_sip')?.effects);
    store.commitTx(tx);
    expect(store.get().runtime.player.hp).toBe(6);
    expect(store.get().runtime.player.sp).toBe(4);
  });

  it('invalid crafting consumes nothing', () => {
    const store = new StateStore(createInitialState());
    const cp = new CheckpointSystem(new EventBus());
    const crafting = new CraftingSystem(cp);
    const tx = store.beginTx('invalid_recipe');
    inventorySystem.addItem(tx, 'ingredient_sunleaf', 1, 'global');
    inventorySystem.addItem(tx, 'ingredient_glow_moth_dust', 1, 'global');
    crafting.open(tx, 'mixing_table_01');
    crafting.setSlot(tx, 'A', 'ingredient_sunleaf');
    crafting.setSlot(tx, 'B', 'ingredient_sunleaf');
    crafting.mix(tx);
    store.commitTx(tx);
    expect(store.get().global.inventory.items['ingredient_sunleaf'].qty).toBe(1);
    expect(store.get().global.inventory.items['ingredient_glow_moth_dust'].qty).toBe(1);
  });

  it('valid crafting consumes + adds and snapshots', () => {
    const bus = new EventBus();
    const store = new StateStore(createInitialState());
    const cp = new CheckpointSystem(bus);
    const spySet = vi.spyOn(cp, 'setCheckpoint');
    const spySnap = vi.spyOn(cp, 'snapshot');
    const crafting = new CraftingSystem(cp);
    const tx = store.beginTx('valid_recipe');
    inventorySystem.addItem(tx, 'ingredient_sunleaf', 1, 'global');
    inventorySystem.addItem(tx, 'ingredient_crystal_water', 1, 'global');
    crafting.open(tx, 'mixing_table_01');
    crafting.setSlot(tx, 'A', 'ingredient_sunleaf');
    crafting.setSlot(tx, 'B', 'ingredient_crystal_water');
    crafting.mix(tx);
    store.commitTx(tx);
    expect(inventorySystem.getQty(store.get(), 'potion_lantern_oil', 'global')).toBe(1);
    expect(spySet).toHaveBeenCalled();
    expect(spySnap).toHaveBeenCalled();
  });

  it('interpreter is transactional for remove failure', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('effect_txn');
    const interpreter = new EffectInterpreter(new EventBus());
    const result = interpreter.applyEffects(tx, [
      { op: 'hp.delta', value: 2 },
      { op: 'inventory.remove', itemId: 'ingredient_sunleaf', qty: 1 },
    ] as never);
    expect(result.ok).toBe(false);
    expect(tx.draftState.runtime.player.hp).toBe(6);
  });
});
