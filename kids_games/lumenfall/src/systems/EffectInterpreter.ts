import type { Command, CommandQueue } from '../app/Commands';
import type { EventBus } from '../app/EventBus';
import type { DraftTx } from '../state/StateStore';
import { inventorySystem, type InventoryScope } from './InventorySystem';
import type { CheckpointSystem } from './CheckpointSystem';
import type { SceneEffectOp } from './SceneDatabase';
import type { ItemDef } from './ItemDatabase';

type EffectOp = NonNullable<ItemDef['effects']>[number] | SceneEffectOp;

interface MutationPlan {
  inventoryRemoves: Array<{ itemId: string; qty: number; scope: InventoryScope }>;
  inventoryAdds: Array<{ itemId: string; qty: number; scope: InventoryScope }>;
  hpDelta: number;
  spDelta: number;
  flags: Array<{ key: string; value: unknown }>;
  checkpointSet?: string;
  checkpointSnapshot: boolean;
  mapTeleport?: { x: number; y: number };
  commands: Command[];
  uiMessages: string[];
  manualPause?: boolean;
}

export class EffectInterpreter {
  constructor(
    private readonly bus: EventBus,
    private readonly commandQueue?: CommandQueue,
    private readonly checkpointSystem?: CheckpointSystem,
  ) {}

  applyEffects(tx: DraftTx, effects: EffectOp[] = [], context: { scope?: InventoryScope } = {}): { ok: boolean; error?: string } {
    const defaultScope = context.scope ?? 'global';
    const plan: MutationPlan = {
      inventoryRemoves: [],
      inventoryAdds: [],
      hpDelta: 0,
      spDelta: 0,
      flags: [],
      checkpointSnapshot: false,
      commands: [],
      uiMessages: [],
    };

    for (const effect of effects) {
      if (effect.op === 'inventory.remove') {
        const scope = 'scope' in effect && effect.scope ? effect.scope : defaultScope;
        plan.inventoryRemoves.push({ itemId: effect.itemId, qty: effect.qty, scope });
        continue;
      }
      if (effect.op === 'inventory.add') {
        const scope = 'scope' in effect && effect.scope ? effect.scope : defaultScope;
        plan.inventoryAdds.push({ itemId: effect.itemId, qty: effect.qty, scope });
        continue;
      }
      if (effect.op === 'hp.delta') {
        plan.hpDelta += effect.value;
        continue;
      }
      if (effect.op === 'sp.delta') {
        plan.spDelta += effect.value;
        continue;
      }
      if (effect.op === 'flag.set') {
        plan.flags.push({ key: effect.key, value: effect.value });
        continue;
      }
      if (effect.op === 'checkpoint.set') {
        plan.checkpointSet = effect.checkpointId;
        continue;
      }
      if (effect.op === 'checkpoint.snapshot') {
        plan.checkpointSnapshot = true;
        continue;
      }
      if (effect.op === 'crafting.open') {
        plan.commands.push({ kind: 'RequestMode', nextMode: 'CRAFTING' });
        continue;
      }
      if (effect.op === 'encounter.start') {
        plan.commands.push({ kind: 'StartEncounter', templateId: effect.templateId });
        continue;
      }
      if (effect.op === 'map.teleport') {
        plan.mapTeleport = { x: effect.x, y: effect.y };
        continue;
      }
      if (effect.op === 'ui.message') {
        plan.uiMessages.push(effect.text);
        continue;
      }
      if (effect.op === 'time.pause') {
        plan.manualPause = true;
        continue;
      }
      if (effect.op === 'time.resume') {
        plan.manualPause = false;
        continue;
      }
      if (effect.op === 'status.add') {
        tx.touchRuntimePlayer();
        const nowMs = Math.floor(tx.draftState.runtime.time.secondsIntoCycle * 1000);
        tx.draftState.runtime.player.status[effect.statusId] = effect.durationSeconds ? nowMs + effect.durationSeconds * 1000 : true;
        continue;
      }
      if (effect.op === 'areaEffect.cleanseShadows') {
        this.bus.emit({ type: 'AREA_EFFECT', kind: 'cleanseShadows', radius: effect.radius, filter: effect.filter ?? 'environmental' });
      }
    }

    for (const removal of plan.inventoryRemoves) {
      if (!inventorySystem.hasItem(tx.draftState, removal.itemId, removal.qty, removal.scope)) {
        return { ok: false, error: `Missing ${removal.itemId}` };
      }
    }

    const nextSp = tx.draftState.runtime.player.sp + plan.spDelta;
    if (nextSp < 0) {
      return { ok: false, error: 'Not enough SP' };
    }

    for (const removal of plan.inventoryRemoves) {
      inventorySystem.removeItem(tx, removal.itemId, removal.qty, removal.scope);
    }
    for (const add of plan.inventoryAdds) {
      inventorySystem.addItem(tx, add.itemId, add.qty, add.scope);
    }

    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.hp = Math.max(0, Math.min(tx.draftState.global.player.maxHP, tx.draftState.runtime.player.hp + plan.hpDelta));
    tx.draftState.runtime.player.sp = Math.max(0, Math.min(tx.draftState.global.player.maxSP, tx.draftState.runtime.player.sp + plan.spDelta));

    if (plan.flags.length > 0) {
      for (const flag of plan.flags) {
        if (flag.key.startsWith('runtime.')) {
          tx.touchRuntimeFlags();
          const value =
            flag.key === 'runtime.shadowAction' && typeof flag.value === 'object' && flag.value
              ? {
                  ...(flag.value as Record<string, unknown>),
                  shadowId:
                    (flag.value as Record<string, unknown>).shadowId ?? tx.draftState.runtime.encounterContext?.shadowId,
                }
              : flag.value;
          tx.draftState.runtime.runtimeFlags[flag.key] = value;
        } else {
          tx.touchStoryFlags();
          tx.draftState.story.flags[flag.key] = Boolean(flag.value);
        }
      }
    }

    if (plan.checkpointSet && this.checkpointSystem) {
      this.checkpointSystem.setCheckpoint(tx, plan.checkpointSet);
    }
    if (plan.checkpointSnapshot && this.checkpointSystem) {
      this.checkpointSystem.snapshot(tx);
    }

    if (plan.mapTeleport) {
      tx.touchRuntimePlayer();
      tx.touchRuntimeMap();
      tx.draftState.runtime.player.x = plan.mapTeleport.x;
      tx.draftState.runtime.player.y = plan.mapTeleport.y;
      tx.draftState.runtime.player.px = plan.mapTeleport.x * 32;
      tx.draftState.runtime.player.py = plan.mapTeleport.y * 32;
      tx.draftState.runtime.map.mapsVisited[tx.draftState.runtime.map.currentMapId] = { lastX: plan.mapTeleport.x, lastY: plan.mapTeleport.y };
    }

    if (typeof plan.manualPause === 'boolean') {
      tx.touchRuntimeTime();
      tx.draftState.runtime.time.paused = plan.manualPause;
    }

    if (plan.uiMessages.length > 0) {
      tx.touchRuntimeUi();
      for (const m of plan.uiMessages) {
        tx.draftState.runtime.ui.messages.push(m);
        this.bus.emit({ type: 'UI_MESSAGE', text: m });
      }
    }

    if (this.commandQueue) {
      for (const cmd of plan.commands) this.commandQueue.enqueue(cmd);
    }

    return { ok: true };
  }
}
