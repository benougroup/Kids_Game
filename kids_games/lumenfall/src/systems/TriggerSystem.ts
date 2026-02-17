import type { CommandQueue } from '../app/Commands';
import type { GameState } from '../state/StateTypes';
import { MapSystem, type MapTrigger, type MapTriggerAction } from './MapSystem';

export interface TriggerEvalContext {
  movedTile: boolean;
  fromX: number;
  fromY: number;
  interactPressed: boolean;
  nowMs: number;
}

const insideArea = (x: number, y: number, area: { x: number; y: number; w: number; h: number }): boolean =>
  x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;

export class TriggerSystem {
  private readonly cooldownRegistry: Record<string, number> = {};

  constructor(private readonly mapSystem: MapSystem) {}

  evaluate(state: GameState, commandQueue: CommandQueue, context: TriggerEvalContext): void {
    const mapId = state.runtime.map.currentMapId;
    const playerX = state.runtime.player.x;
    const playerY = state.runtime.player.y;
    const triggers = this.mapSystem.getTriggers(mapId);

    for (const trigger of triggers) {
      if (!this.shouldFire(state, trigger, context, playerX, playerY)) {
        continue;
      }

      this.fireTrigger(state, commandQueue, mapId, trigger);
      this.cooldownRegistry[`${mapId}:${trigger.id}`] = context.nowMs;
    }

    if (context.interactPressed) {
      const interactable = this.mapSystem.findInteractableAt(mapId, playerX, playerY);
      if (interactable?.type === 'door') {
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
    state: Readonly<GameState>,
    trigger: MapTrigger,
    context: TriggerEvalContext,
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
      if (!context.movedTile) return false;
      if (typeof trigger.x === 'number' && typeof trigger.y === 'number') {
        return playerX === trigger.x && playerY === trigger.y;
      }
      if (trigger.area) {
        return insideArea(playerX, playerY, trigger.area);
      }
      return true;
    }

    if (trigger.type === 'onEnterArea') {
      if (!trigger.area || !context.movedTile) return false;
      const wasInside = insideArea(context.fromX, context.fromY, trigger.area);
      const nowInside = insideArea(playerX, playerY, trigger.area);
      return !wasInside && nowInside;
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

  private fireTrigger(state: GameState, commandQueue: CommandQueue, mapId: string, trigger: MapTrigger): void {
    for (const action of trigger.actions) {
      this.applyAction(state, commandQueue, action);
    }

    if (trigger.once) {
      this.mapSystem.markTriggerFired(state, mapId, trigger.id);
    }
  }

  private applyAction(state: GameState, commandQueue: CommandQueue, action: MapTriggerAction): void {
    if (action.type === 'ui.message' && action.text) {
      commandQueue.enqueue({ kind: 'UiMessage', text: action.text });
      return;
    }

    if (action.type === 'checkpoint.set') {
      state.runtime.checkpoint.lastCheckpointId = action.checkpointId ?? 'checkpoint_unknown';
      return;
    }

    if (action.type === 'checkpoint.snapshot') {
      state.runtime.checkpoint.snapshot = {
        mapId: state.runtime.map.currentMapId,
        x: state.runtime.player.x,
        y: state.runtime.player.y,
        hp: state.runtime.player.hp,
        sp: state.runtime.player.sp,
      };
      return;
    }

    if (action.type === 'map.transition' && action.toMapId && typeof action.toX === 'number' && typeof action.toY === 'number') {
      commandQueue.enqueue({
        kind: 'RequestMapTransition',
        toMapId: action.toMapId,
        toX: action.toX,
        toY: action.toY,
      });
    }
  }
}
