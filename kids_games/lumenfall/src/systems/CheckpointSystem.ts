import type { EventBus } from '../app/EventBus';
import { tileToPixel } from './MapSystem';
import type { DraftTx } from '../state/StateStore';
import type { CheckpointSnapshot, GameState, SnapshotFacing } from '../state/StateTypes';

const RESTORE_HP_MODE = 'FULL' as const;
const RESTORE_SP_MODE = 'ZERO' as const;

const toSnapshotFacing = (facing: GameState['runtime']['player']['facing']): SnapshotFacing => {
  if (facing === 'up') return 'N';
  if (facing === 'down') return 'S';
  if (facing === 'left') return 'W';
  return 'E';
};

const fromSnapshotFacing = (facing: SnapshotFacing): GameState['runtime']['player']['facing'] => {
  if (facing === 'N') return 'up';
  if (facing === 'S') return 'down';
  if (facing === 'W') return 'left';
  return 'right';
};

export class CheckpointSystem {
  constructor(private readonly bus: EventBus) {}

  setCheckpoint(tx: DraftTx, checkpointId: string): void {
    tx.touchRuntimeCheckpoint();
    tx.draftState.runtime.checkpoint.lastCheckpointId = checkpointId;
    tx.draftState.runtime.checkpoint.dirty = true;
  }

  snapshot(tx: DraftTx): CheckpointSnapshot {
    tx.touchRuntimeCheckpoint();
    const draft = tx.draftState;
    const checkpointId = draft.runtime.checkpoint.lastCheckpointId ?? 'checkpoint_fallback';

    const snapshot: CheckpointSnapshot = {
      checkpointId,
      mapId: draft.runtime.map.currentMapId,
      player: {
        x: draft.runtime.player.x,
        y: draft.runtime.player.y,
        facing: toSnapshotFacing(draft.runtime.player.facing),
        hp: draft.runtime.player.hp,
        sp: draft.runtime.player.sp,
      },
      story: {
        activeStoryId: draft.story.activeStoryId,
        flags: { ...draft.story.flags },
        stage: { ...draft.story.stage },
        npc: {
          townFear: draft.story.npc.townFear,
          trust: { ...draft.story.npc.trust },
          npcFlags: {},
        },
        storyInventory: { ...draft.story.storyInventory },
        storyShadowById: { ...draft.story.storyShadow.byId },
      },
      time: {
        phase: draft.runtime.time.phase,
        secondsIntoCycle: draft.runtime.time.secondsIntoCycle,
        dayCount: draft.runtime.time.dayCount,
      },
      createdAtMs: Date.now(),
    };

    draft.runtime.checkpoint.snapshot = snapshot;
    draft.runtime.checkpoint.dirty = false;
    return snapshot;
  }

  restoreFromSnapshot(tx: DraftTx, snapshot: CheckpointSnapshot): void {
    tx.touchRuntime();
    tx.touchRuntimeMap();
    tx.touchRuntimePlayer();
    tx.touchRuntimeUi();
    tx.touchRuntimeDialogue();
    tx.touchRuntimeCrafting();

    const draft = tx.draftState;

    draft.runtime.dialogue.active = false;
    draft.runtime.dialogue.nodeId = null;
    draft.runtime.crafting.active = false;
    draft.runtime.crafting.recipeId = null;
    draft.runtime.ui.messages = ['Your lantern dims...'];
    draft.runtime.map.transition = undefined;

    draft.runtime.map.currentMapId = snapshot.mapId;
    draft.runtime.player.x = snapshot.player.x;
    draft.runtime.player.y = snapshot.player.y;
    draft.runtime.player.px = tileToPixel(snapshot.player.x);
    draft.runtime.player.py = tileToPixel(snapshot.player.y);
    draft.runtime.player.facing = fromSnapshotFacing(snapshot.player.facing);
    draft.runtime.map.mapsVisited[snapshot.mapId] = { lastX: snapshot.player.x, lastY: snapshot.player.y };

    draft.runtime.player.hp = RESTORE_HP_MODE === 'FULL' ? draft.global.player.maxHP : snapshot.player.hp;
    draft.runtime.player.sp = RESTORE_SP_MODE === 'ZERO' ? 0 : snapshot.player.sp;
    draft.runtime.player.status = {};

    tx.touchStory();
    draft.story = {
      ...draft.story,
      activeStoryId: snapshot.story.activeStoryId,
      flags: { ...snapshot.story.flags },
      stage: { ...snapshot.story.stage },
      npc: {
        ...draft.story.npc,
        townFear: snapshot.story.npc.townFear,
        trust: { ...snapshot.story.npc.trust },
      },
      storyInventory: { ...snapshot.story.storyInventory },
      storyShadow: {
        byId: { ...snapshot.story.storyShadowById },
      },
    };

    tx.touchRuntimeTime();
    draft.runtime.time.phase = draft.runtime.time.phase === snapshot.time.phase ? draft.runtime.time.phase : (snapshot.time.phase as GameState['runtime']['time']['phase']);
    draft.runtime.time.secondsIntoCycle = snapshot.time.secondsIntoCycle;
    draft.runtime.time.dayCount = snapshot.time.dayCount;

    tx.touchRuntimeCheckpoint();
    draft.runtime.checkpoint.lastCheckpointId = snapshot.checkpointId;
    draft.runtime.checkpoint.snapshot = snapshot;
    draft.runtime.checkpoint.dirty = false;
  }

  emitRestored(snapshot: CheckpointSnapshot): void {
    this.bus.emit({ type: 'CHECKPOINT_RESTORED', checkpointId: snapshot.checkpointId, mapId: snapshot.mapId });
  }
}
