import type { EventBus } from '../app/EventBus';
import type { DraftTx } from '../state/StateStore';
import { LightSystem } from './LightSystem';
import { MapSystem } from './MapSystem';
import { inventorySystem } from './InventorySystem';

export type IngredientPickup = {
  id: string;
  itemId: string;
  x: number;
  y: number;
  spawnedAt: number;
};

export class IngredientSystem {
  private readonly maxActivePickups = 6;
  private readonly spawnCheckIntervalMs = 10000; // Check every 10 seconds
  private lastSpawnCheckMs = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly mapSystem: MapSystem,
    private readonly lightSystem: LightSystem,
  ) {}

  update(tx: DraftTx, nowMs: number): void {
    const state = tx.draftState;
    
    // Only spawn at night
    if (state.runtime.time.phase !== 'NIGHT') {
      return;
    }

    // Check if it's time to spawn more ingredients
    if (nowMs - this.lastSpawnCheckMs < this.spawnCheckIntervalMs) {
      return;
    }

    this.lastSpawnCheckMs = nowMs;

    const currentPickups = state.runtime.ingredientPickups || [];
    if (currentPickups.length >= this.maxActivePickups) {
      return;
    }

    // Try to spawn new ingredients
    const toSpawn = this.maxActivePickups - currentPickups.length;
    for (let i = 0; i < toSpawn; i++) {
      this.trySpawnIngredient(tx, nowMs);
    }
  }

  private trySpawnIngredient(tx: DraftTx, nowMs: number): void {
    const state = tx.draftState;
    const map = this.mapSystem.getCurrentMap(state);
    
    // Try random positions up to 20 times
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * map.width);
      const y = Math.floor(Math.random() * map.height);

      // Check if tile is DIM or DARK
      const lightLevel = this.lightSystem.getTileLightLevel(state, x, y);
      if (lightLevel !== 'DIM' && lightLevel !== 'DARK') {
        continue;
      }

      // Check if tile is walkable (not collision)
      const collisionLayer = map.layers?.collision;
      if (!collisionLayer || !Array.isArray(collisionLayer)) continue;
      const collisionRow = collisionLayer[y];
      if (!collisionRow || !Array.isArray(collisionRow)) continue;
      const collision = collisionRow[x];
      if (collision === 1) {
        continue;
      }

      // Check if there's already a pickup here
      const currentPickups = state.runtime.ingredientPickups || [];
      const existsHere = currentPickups.some((p: { x: number; y: number }) => p.x === x && p.y === y);
      if (existsHere) {
        continue;
      }

      // Spawn ingredient
      const ingredientTypes = ['ingredient_sunleaf', 'ingredient_glow_moth_dust', 'ingredient_crystal_water'];
      const itemId = ingredientTypes[Math.floor(Math.random() * ingredientTypes.length)];
      
      tx.touchRuntimeIngredientPickups();
      if (!tx.draftState.runtime.ingredientPickups) {
        tx.draftState.runtime.ingredientPickups = [];
      }

      tx.draftState.runtime.ingredientPickups.push({
        id: `ingredient_${nowMs}_${x}_${y}`,
        itemId,
        x,
        y,
        spawnedAt: nowMs,
      });

      return; // Successfully spawned one
    }
  }

  checkPickup(tx: DraftTx, playerX: number, playerY: number): void {
    const state = tx.draftState;
    const pickups = state.runtime.ingredientPickups || [];
    
    const pickup = pickups.find((p: { x: number; y: number }) => p.x === playerX && p.y === playerY);
    if (!pickup) {
      return;
    }

    // Collect the ingredient
    tx.touchRuntimeIngredientPickups();
    
    // Remove from pickups
    tx.draftState.runtime.ingredientPickups = pickups.filter((p: { id: string }) => p.id !== pickup.id);
    
    // Add to inventory
    inventorySystem.addItem(tx, pickup.itemId, 1, 'global');

    // Emit event
    this.bus.emit({ type: 'INGREDIENT_COLLECTED', itemId: pickup.itemId, x: playerX, y: playerY });
  }

  clearAllPickups(tx: DraftTx): void {
    tx.touchRuntimeIngredientPickups();
    tx.draftState.runtime.ingredientPickups = [];
  }

  // Called at dawn to clear night-spawned ingredients
  onDawn(tx: DraftTx): void {
    this.clearAllPickups(tx);
  }
}
