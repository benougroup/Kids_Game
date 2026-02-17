import type { CommandQueue } from '../app/Commands';
import type { EventBus } from '../app/EventBus';
import type { ModeMachine } from '../app/ModeMachine';
import type { DraftTx } from '../state/StateStore';
import type { CheckpointSystem } from './CheckpointSystem';
import { EffectInterpreter } from './EffectInterpreter';
import { evaluateSceneConditions } from './DialogueSystemConditions';
import { storyDatabase, type StoryDatabase } from './StoryDatabase';
import { isStableForNewMode } from '../app/Stability';

const MAX_VISITS = 40;

export class DialogueSystem {
  private readonly interpreter: EffectInterpreter;

  constructor(
    private readonly deps: {
      commandQueue: CommandQueue;
      modeMachine: ModeMachine;
      checkpointSystem: CheckpointSystem;
      bus: EventBus;
      storyDb?: StoryDatabase;
    },
  ) {
    this.interpreter = new EffectInterpreter(deps.bus, deps.commandQueue, deps.checkpointSystem);
  }

  startScene(tx: DraftTx, storyId: string, sceneId?: string): void {
    if (!isStableForNewMode(tx.draftState)) {
      return;
    }
    const story = (this.deps.storyDb ?? storyDatabase).getStory(storyId);
    if (!story) {
      this.routeToError(tx, storyId, `Unknown story '${storyId}'`);
      return;
    }
    const startId = sceneId ?? story.startSceneId;

    tx.touchRuntime();
    tx.touchRuntimeDialogue();
    tx.touchRuntimeTime();
    tx.draftState.runtime.mode = this.deps.modeMachine.requestMode(tx.draftState.runtime.mode, 'DIALOGUE');
    tx.draftState.runtime.time.paused = true;
    tx.draftState.runtime.dialogue = {
      active: true,
      storyId,
      sceneId: startId,
      returnMode: 'EXPLORE',
      visitCount: 0,
      visited: {},
    };
    this.markPendingEnter(tx);
  }

  choose(tx: DraftTx, choiceIndex: number): void {
    const runtime = tx.draftState.runtime.dialogue;
    if (!runtime.active) return;
    const sceneDb = (this.deps.storyDb ?? storyDatabase).getSceneDatabase(runtime.storyId);
    const node = sceneDb?.getNode(runtime.sceneId);
    if (!sceneDb || !node) {
      this.routeToError(tx, runtime.storyId, `Missing node '${runtime.sceneId}'`);
      return;
    }

    const choice = node.choices[choiceIndex];
    if (!choice) return;

    if (!evaluateSceneConditions(tx.draftState, choice.conditions)) {
      if (choice.failNext) {
        this.moveToNode(tx, choice.failNext);
      } else {
        tx.touchRuntimeUi();
        tx.draftState.runtime.ui.messages.push('That option is unavailable.');
      }
      return;
    }

    const result = this.interpreter.applyEffects(tx, choice.effects ?? []);
    if (!result.ok) {
      tx.touchRuntimeUi();
      tx.draftState.runtime.ui.messages.push(result.error ?? 'Effect failed');
      return;
    }

    if (choice.next === 'returnToMap') {
      this.end(tx);
      return;
    }

    this.moveToNode(tx, choice.next);
  }

  update(tx: DraftTx): void {
    const runtimeFlags = tx.draftState.runtime.runtimeFlags as Record<string, unknown>;
    if (!runtimeFlags['dialogue.pendingEnter']) {
      return;
    }
    tx.touchRuntimeFlags();
    delete tx.draftState.runtime.runtimeFlags['dialogue.pendingEnter'];
    this.enterCurrentNode(tx);
  }

  end(tx: DraftTx): void {
    tx.touchRuntime();
    tx.touchRuntimeDialogue();
    tx.touchRuntimeTime();
    tx.draftState.runtime.dialogue = {
      active: false,
      storyId: '',
      sceneId: '',
      returnMode: 'EXPLORE',
      visitCount: 0,
      visited: {},
    };
    tx.draftState.runtime.mode = this.deps.modeMachine.requestMode(tx.draftState.runtime.mode, 'EXPLORE');
    tx.draftState.runtime.time.paused = false;
  }

  private moveToNode(tx: DraftTx, nodeId: string): void {
    tx.touchRuntimeDialogue();
    tx.draftState.runtime.dialogue.sceneId = nodeId;
    this.markPendingEnter(tx);
  }

  private markPendingEnter(tx: DraftTx): void {
    tx.touchRuntimeFlags();
    tx.draftState.runtime.runtimeFlags['dialogue.pendingEnter'] = true;
  }

  private enterCurrentNode(tx: DraftTx): void {
    const d = tx.draftState.runtime.dialogue;
    const sceneDb = (this.deps.storyDb ?? storyDatabase).getSceneDatabase(d.storyId);
    if (!sceneDb) {
      this.routeToError(tx, d.storyId, `Missing scene DB for '${d.storyId}'`);
      return;
    }

    tx.touchRuntimeDialogue();
    d.visitCount += 1;
    d.visited[d.sceneId] = (d.visited[d.sceneId] ?? 0) + 1;

    if (d.visitCount > MAX_VISITS) {
      this.routeToError(tx, d.storyId, 'Loop guard triggered');
      return;
    }

    const node = sceneDb.getNode(d.sceneId);
    if (!sceneDb.hasNode(d.sceneId)) {
      d.lastError = `Missing node '${d.sceneId}'`;
      d.sceneId = '__error__';
      return;
    }

    if (!evaluateSceneConditions(tx.draftState, node.conditions)) {
      tx.touchRuntimeUi();
      tx.draftState.runtime.ui.messages.push('Scene conditions not met.');
      return;
    }

    const result = this.interpreter.applyEffects(tx, node.onEnterEffects ?? []);
    if (!result.ok) {
      tx.touchRuntimeDialogue();
      d.lastError = result.error;
      this.routeToError(tx, d.storyId, result.error ?? 'onEnter effect failed');
    }
  }

  private routeToError(tx: DraftTx, storyId: string, msg: string): void {
    tx.touchRuntimeDialogue();
    tx.touchRuntimeUi();
    tx.draftState.runtime.dialogue.active = true;
    tx.draftState.runtime.dialogue.storyId = storyId;
    tx.draftState.runtime.dialogue.sceneId = '__error__';
    tx.draftState.runtime.dialogue.lastError = msg;
    tx.draftState.runtime.ui.messages.push(`Dialogue error: ${msg}`);
  }
}
