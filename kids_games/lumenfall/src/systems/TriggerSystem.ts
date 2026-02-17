import type { CommandQueue } from '../app/Commands';
import { shouldProcessTriggers } from '../app/Stability';
import type { DraftTx } from '../state/StateStore';
import { CheckpointSystem } from './CheckpointSystem';
import { MapSystem, type MapTrigger, type MapTriggerAction } from './MapSystem';

export interface TriggerEvalContext {
  movedTile: boolean;
  interactPressed: boolean;
  nowMs: number;
  fromX?: number;
  fromY?: number;
}

const insideArea = (x: number, y: number, area: { x: number; y: number; w: number; h: number }): boolean =>
  x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;

export class TriggerSystem {
  private readonly cooldownRegistry: Record<string, number> = {};
  private lastPlayerTile: { mapId: string; x: number; y: number } | null = null;
  private readonly lastInsideAreas: Record<string, Record<string, boolean>> = {};

  constructor(
    private readonly mapSystem: MapSystem,
    private readonly checkpointSystem: CheckpointSystem,
  ) {}

  evaluate(tx: DraftTx, commandQueue: CommandQueue, context: TriggerEvalContext): void {
    const state = tx.draftState;
    if (!shouldProcessTriggers(state)) {
      this.syncRuntimeState(state.runtime.map.currentMapId, state.runtime.player.x, state.runtime.player.y);
      return;
    }

    const mapId = state.runtime.map.currentMapId;
    const playerX = state.runtime.player.x;
    const playerY = state.runtime.player.y;
    const movedTile = context.movedTile || this.didMoveTile(mapId, playerX, playerY);
    this.syncRuntimeState(mapId, playerX, playerY);

    const triggers = this.mapSystem.getTriggers(mapId);

    for (const trigger of triggers) {
      if (!this.shouldFire(state, trigger, context, movedTile, playerX, playerY)) {
        continue;
      }

      this.fireTrigger(tx, commandQueue, mapId, trigger);
      this.cooldownRegistry[`${mapId}:${trigger.id}`] = context.nowMs;
    }

    if (context.interactPressed) {
      const interactable = this.mapSystem.findInteractableAt(mapId, playerX, playerY);
      if (interactable?.type === 'door' && interactable.toMapId && typeof interactable.toX === 'number' && typeof interactable.toY === 'number') {
        commandQueue.enqueue({
          kind: 'RequestMapTransition',
          toMapId: interactable.toMapId,
          toX: interactable.toX,
          toY: interactable.toY,
        });
      }
    }
  }

  private shouldFire(
    state: Readonly<DraftTx['draftState']>,
    trigger: MapTrigger,
    context: TriggerEvalContext,
    movedTile: boolean,
    playerX: number,
    playerY: number,
  ): boolean {
    const mapId = state.runtime.map.currentMapId;

    if (trigger.once && this.mapSystem.hasTriggerFired(state, mapId, trigger.id)) {
      return false;
    }

    const cooldownMs = trigger.cooldownMs ?? 0;
    if (cooldownMs > 0) {
      const key = `${mapId}:${trigger.id}`;
      const last = this.cooldownRegistry[key] ?? -Infinity;
      if (context.nowMs - last < cooldownMs) {
        return false;
      }
    }

    if (trigger.type === 'onStep') {
      if (!movedTile) return false;
      if (typeof trigger.x === 'number' && typeof trigger.y === 'number') {
        return playerX === trigger.x && playerY === trigger.y;
      }
      if (trigger.area) {
        return insideArea(playerX, playerY, trigger.area);
      }
      return true;
    }

    if (trigger.type === 'onEnterArea') {
      if (!trigger.area || !movedTile) return false;
      const priorInside = typeof context.fromX === 'number' && typeof context.fromY === 'number'
        ? insideArea(context.fromX, context.fromY, trigger.area)
        : (this.lastInsideAreas[mapId]?.[trigger.id] ?? false);
      const nowInside = insideArea(playerX, playerY, trigger.area);
      this.lastInsideAreas[mapId] ??= {};
      this.lastInsideAreas[mapId][trigger.id] = nowInside;
      return !priorInside && nowInside;
    }

    if (!context.interactPressed) return false;
    if (typeof trigger.x === 'number' && typeof trigger.y === 'number') {
      return playerX === trigger.x && playerY === trigger.y;
    }
    if (trigger.area) {
      return insideArea(playerX, playerY, trigger.area);
    }

    return true;
  }

  private didMoveTile(mapId: string, x: number, y: number): boolean {
    if (!this.lastPlayerTile || this.lastPlayerTile.mapId !== mapId) {
      return true;
    }
    return this.lastPlayerTile.x !== x || this.lastPlayerTile.y !== y;
  }

  private syncRuntimeState(mapId: string, x: number, y: number): void {
    this.lastPlayerTile = { mapId, x, y };
  }

  private fireTrigger(tx: DraftTx, commandQueue: CommandQueue, mapId: string, trigger: MapTrigger): void {
    for (const action of trigger.actions) {
      this.applyAction(tx, commandQueue, action);
    }

    if (trigger.once) {
      this.mapSystem.markTriggerFired(tx.draftState, mapId, trigger.id);
    }
  }

  private applyAction(tx: DraftTx, commandQueue: CommandQueue, action: MapTriggerAction): void {
    if (action.type === 'ui.message' && action.text) {
      commandQueue.enqueue({ kind: 'UiMessage', text: action.text });
      return;
    }

    if (action.type === 'checkpoint.set') {
      this.checkpointSystem.setCheckpoint(tx, action.checkpointId ?? 'checkpoint_unknown');
      return;
    }

    if (action.type === 'checkpoint.snapshot') {
      this.checkpointSystem.snapshot(tx);
      return;
    }

    if (action.type === 'map.transition' && action.toMapId && typeof action.toX === 'number' && typeof action.toY === 'number') {
      commandQueue.enqueue({
        kind: 'RequestMapTransition',
        toMapId: action.toMapId,
        toX: action.toX,
        toY: action.toY,
      });
      return;
    }

    if (action.type === 'startScene' && action.storyId) {
      commandQueue.enqueue({ kind: 'StartScene', storyId: action.storyId, sceneId: action.sceneId });
    }
  }
}
