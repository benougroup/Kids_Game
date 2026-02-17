import { CommandQueue, type Command } from './Commands';
import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { ModeMachine, type Mode } from './ModeMachine';
import { TILE_SIZE } from './Config';
import { isStableForNewMode, shouldAdvanceTime, shouldProcessTriggers } from './Stability';
import { GameLoop } from '../engine/GameLoop';
import { Renderer } from '../engine/Renderer';
import { Camera } from '../engine/Camera';
import { Input } from '../engine/Input';
import { StateStore } from '../state/StateStore';
import { MapSystem, advanceMapTransition, applyTransitionSwap } from '../systems/MapSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { TriggerSystem } from '../systems/TriggerSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { LightSystem } from '../systems/LightSystem';
import { CheckpointSystem } from '../systems/CheckpointSystem';
import { damage } from '../systems/StatsSystem';
import { inventorySystem } from '../systems/InventorySystem';
import { itemDatabase } from '../systems/ItemDatabase';
import { EffectInterpreter } from '../systems/EffectInterpreter';
import { CraftingSystem } from '../systems/CraftingSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { ShadowSystem } from '../systems/ShadowSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AssetManager } from '../engine/AssetManager';
import { encounterDatabase } from '../systems/EncounterDatabase';

const WORLD_TILE_WIDTH = 100;
const WORLD_TILE_HEIGHT = 100;
const FAINT_FADE_MS = 250;

export class GameApp {
  private readonly store = new StateStore();
  private readonly bus = new EventBus();
  private readonly modeMachine = new ModeMachine();
  private readonly logger = new Logger();
  private readonly commandQueue = new CommandQueue(this.bus);
  private readonly mapSystem = new MapSystem();
  private readonly checkpointSystem = new CheckpointSystem(this.bus);
  private readonly playerSystem = new PlayerSystem(this.mapSystem);
  private readonly triggerSystem = new TriggerSystem(this.mapSystem, this.checkpointSystem);
  private readonly effectInterpreter = new EffectInterpreter(this.bus, this.commandQueue, this.checkpointSystem);
  private readonly dialogueSystem = new DialogueSystem({
    commandQueue: this.commandQueue,
    modeMachine: this.modeMachine,
    checkpointSystem: this.checkpointSystem,
    bus: this.bus,
  });
  private readonly craftingSystem = new CraftingSystem(this.checkpointSystem, this.bus);
  private readonly timeSystem = new TimeSystem({ bus: this.bus, modeMachine: this.modeMachine });
  private readonly lightSystem = new LightSystem({ mapSystem: this.mapSystem, bus: this.bus });
  private readonly shadowSystem = new ShadowSystem({ mapSystem: this.mapSystem, lightSystem: this.lightSystem, commandQueue: this.commandQueue });
  private readonly saveSystem = new SaveSystem({ store: this.store, bus: this.bus, modeMachine: this.modeMachine });
  private readonly camera = new Camera(WORLD_TILE_WIDTH * TILE_SIZE, WORLD_TILE_HEIGHT * TILE_SIZE);
  private readonly renderer: Renderer;
  private readonly assetManager = new AssetManager();
  private readonly input: Input;
  private readonly loop: GameLoop;
  private showLightOverlay = false;
  private showPerfHud = true;
  private pendingSaveControl: null | { kind: 'load' } | { kind: 'new_game' } | { kind: 'new_story'; storyId: string } | { kind: 'manual_save' } = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, this.camera, this.mapSystem, this.lightSystem);
    this.input = new Input(canvas, this.camera);
    this.loop = new GameLoop(this.update, this.render);

    const tx = this.store.beginTx('light_init');
    this.lightSystem.initialize(this.store.get(), tx);
    this.ensureFallbackCheckpoint(tx);
    inventorySystem.addItem(tx, 'ingredient_sunleaf', 3, 'global');
    inventorySystem.addItem(tx, 'ingredient_glow_moth_dust', 3, 'global');
    inventorySystem.addItem(tx, 'ingredient_crystal_water', 3, 'global');
    this.store.commitTx(tx);
    this.saveSystem.loadNow();
  }

  start(): void {
    this.beginLoadingAssets();
    this.loop.start();
  }

  private readonly update = (dtMs: number): void => {
    const state = this.store.get();
    if (state.runtime.mode === 'LOADING') return;
    const intent = this.input.poll(state.runtime.mode, state.runtime.player.x, state.runtime.player.y, state);
    for (const command of intent.commands) {
      this.commandQueue.enqueue(command);
    }

    const tx = this.store.beginTx('frame_update');
    try {
      tx.touchRuntimeMap();
      tx.touchRuntimePlayer();
      tx.touchRuntimeCheckpoint();
      tx.touchRuntimeMapTriggerFlags();
      tx.touchRuntimeTime();
      tx.touchRuntimeSave();
      tx.touchRuntimeInventoryUi();

      if (this.tryPreemptFaint(tx)) {
        this.store.commitTx(tx);
        this.saveSystem.onPostCommit(this.store.get());
        this.processPendingSaveControl();
        return;
      }

      this.applyCommands(this.commandQueue.drain(), tx.draftState.runtime.mode, tx);

      if (tx.draftState.runtime.mode === 'FAINTING') {
        this.stepFainting(dtMs, tx);
      } else if (tx.draftState.runtime.mode === 'MAP_TRANSITION') {
        this.stepMapTransition(dtMs, tx);
      } else {
        this.dialogueSystem.update(tx);
        if (shouldAdvanceTime(tx.draftState)) {
          this.timeSystem.update(dtMs, tx);
        }
        if (tx.draftState.runtime.mode === 'EXPLORE') {
          this.shadowSystem.update(tx, performance.now(), dtMs);
          const clearMoveIntent = Boolean(tx.draftState.runtime.runtimeFlags['runtime.clearMoveIntent']);
          if (clearMoveIntent) {
            tx.touchRuntimeFlags();
            delete tx.draftState.runtime.runtimeFlags['runtime.clearMoveIntent'];
          }
          const moveResult = this.playerSystem.applyMovementIntent(tx.draftState, clearMoveIntent ? 0 : intent.moveDx, clearMoveIntent ? 0 : intent.moveDy);
          if (shouldProcessTriggers(tx.draftState)) {
            this.triggerSystem.evaluate(tx, this.commandQueue, {
              movedTile: moveResult.movedTile,
              interactPressed: intent.interactPressed,
              nowMs: performance.now(),
            });
          }
          if (intent.interactPressed) {
            const i = this.mapSystem.findInteractableAt(tx.draftState.runtime.map.currentMapId, tx.draftState.runtime.player.x, tx.draftState.runtime.player.y);
            if (i?.type === 'mixingTable') {
              this.craftingSystem.open(tx, i.id);
            }
          }
          this.applyCommands(this.commandQueue.drain(), tx.draftState.runtime.mode, tx);
        }
      }

      tx.draftState.runtime.save.blockedByFaint = tx.draftState.runtime.mode === 'FAINTING';
      this.lightSystem.update(tx);
      this.playerSystem.smoothPixels(tx.draftState, dtMs);
      this.store.commitTx(tx);
      this.saveSystem.onPostCommit(this.store.get());
      this.processPendingSaveControl();
    } catch (error) {
      this.store.rollbackTx(tx);
      this.logger.error('Transaction failed', error);
    }
  };

  private readonly render = (): void => {
    this.renderer.setLightOverlayVisible(this.showLightOverlay);
    this.renderer.setPerfHudVisible(this.showPerfHud);
    this.renderer.render(this.store.get(), this.loop.getFps());
  };

  private beginLoadingAssets(): void {
    const tx = this.store.beginTx('asset_loading_start');
    tx.touchRuntime();
    tx.touchRuntimeTime();
    tx.draftState.runtime.mode = 'LOADING';
    tx.draftState.runtime.time.paused = true;
    this.store.commitTx(tx);

    this.assetManager.loadAtlas('/assets/atlas.png', '/assets/atlas.json').then(() => {
      this.renderer.setAssetManager(this.assetManager);
      const readyTx = this.store.beginTx('asset_loading_done');
      readyTx.touchRuntime();
      readyTx.touchRuntimeTime();
      readyTx.draftState.runtime.mode = 'EXPLORE';
      readyTx.draftState.runtime.time.paused = false;
      this.store.commitTx(readyTx);
    }).catch(() => {
      const fallbackTx = this.store.beginTx('asset_loading_fallback');
      fallbackTx.touchRuntime();
      fallbackTx.touchRuntimeTime();
      fallbackTx.touchRuntimeUi();
      fallbackTx.draftState.runtime.mode = 'EXPLORE';
      fallbackTx.draftState.runtime.time.paused = false;
      fallbackTx.draftState.runtime.ui.messages.push('Atlas missing, using debug art.');
      this.store.commitTx(fallbackTx);
    });
  }

  private tryPreemptFaint(tx: ReturnType<StateStore['beginTx']>): boolean {
    if (tx.draftState.runtime.player.hp <= 0) {
      this.startFainting(tx.draftState.runtime.mode, tx);
      return true;
    }
    return false;
  }

  private applyCommands(commands: Command[], currentMode: Mode, tx: ReturnType<StateStore['beginTx']>): void {
    let mode = currentMode;

    for (const command of commands) {
      if (command.kind === 'TriggerFaint') {
        this.startFainting(mode, tx);
        return;
      }

      if (command.kind === 'DebugDamage') {
        damage(tx, command.amount, command.source, { commandQueue: this.commandQueue });
        if (tx.draftState.runtime.player.hp <= 0) {
          this.startFainting(mode, tx);
          return;
        }
        continue;
      }

      if ((command.kind === 'StartScene' || command.kind === 'StartEncounter' || command.kind === 'DialogueChoose') && !isStableForNewMode(tx.draftState)) {
        continue;
      }

      if (command.kind === 'RequestMapTransition') {
        const nextMode = this.modeMachine.requestMode(mode, 'MAP_TRANSITION');
        if (nextMode !== mode) {
          tx.touchRuntime();
          tx.touchRuntimeTime();
          tx.touchRuntimeMap();
          tx.draftState.runtime.mode = nextMode;
          tx.draftState.runtime.time.paused = true;
          tx.draftState.runtime.map.transition = { toMapId: command.toMapId, toX: command.toX, toY: command.toY, phase: 'fadeOut', t: 0 };
          this.bus.emit({ type: 'MODE_CHANGED', from: mode, to: nextMode });
          return;
        }
      }

      if (command.kind === 'StartScene') {
        this.dialogueSystem.startScene(tx, command.storyId, command.sceneId);
        mode = tx.draftState.runtime.mode;
        continue;
      }
      if (command.kind === 'DialogueChoose') {
        this.dialogueSystem.choose(tx, command.choiceIndex);
        continue;
      }
      if (command.kind === 'StartEncounter') {
        if (encounterDatabase.hasTemplate(command.templateId)) {
          this.dialogueSystem.startScene(tx, 'encounter', command.templateId);
          mode = tx.draftState.runtime.mode;
        }
        continue;
      }
      if (command.kind === 'ToggleInventory') {
        tx.touchRuntime();
        tx.touchRuntimeTime();
        tx.touchRuntimeInventoryUi();
        const opening = !tx.draftState.runtime.inventoryUI.open;
        tx.draftState.runtime.inventoryUI.open = opening;
        tx.draftState.runtime.mode = opening ? 'INVENTORY' : 'EXPLORE';
        tx.draftState.runtime.time.paused = opening;
        mode = tx.draftState.runtime.mode;
        continue;
      }
      if (command.kind === 'InventorySelectItem') {
        tx.touchRuntimeInventoryUi();
        tx.draftState.runtime.inventoryUI.selectedItemId = command.itemId;
        continue;
      }
      if (command.kind === 'InventoryUseSelected') {
        const selected = tx.draftState.runtime.inventoryUI.selectedItemId;
        if (!selected) continue;
        const item = itemDatabase.getItem(selected);
        if (!item?.effects || inventorySystem.getQty(tx.draftState, selected, 'global') <= 0) continue;
        if (inventorySystem.removeItem(tx, selected, 1, 'global')) this.effectInterpreter.applyEffects(tx, item.effects, { scope: 'global' });
        continue;
      }
      if (command.kind === 'CraftingSetSlot') { this.craftingSystem.setSlot(tx, command.slot, command.itemId); continue; }
      if (command.kind === 'CraftingMix') { this.craftingSystem.mix(tx); continue; }
      if (command.kind === 'CraftingClose') { this.craftingSystem.close(tx); continue; }
      if (command.kind === 'SaveNow') { this.pendingSaveControl = { kind: 'manual_save' }; continue; }
      if (command.kind === 'LoadNow') { this.pendingSaveControl = { kind: 'load' }; continue; }
      if (command.kind === 'NewGame') { this.pendingSaveControl = { kind: 'new_game' }; continue; }
      if (command.kind === 'NewStory') { this.pendingSaveControl = { kind: 'new_story', storyId: command.storyId }; continue; }
      if (command.kind === 'TogglePerfHud') { this.showPerfHud = !this.showPerfHud; continue; }
      if (command.kind === 'RequestMode') {
        const requestedMode = command.nextMode === 'MENU' && mode === 'MENU' ? 'EXPLORE' : command.nextMode;
        const nextMode = this.modeMachine.requestMode(mode, requestedMode);
        if (nextMode !== mode) {
          tx.touchRuntime();
          tx.touchRuntimeTime();
          tx.draftState.runtime.mode = nextMode;
          tx.draftState.runtime.time.paused = this.modeMachine.timePausedInMode(nextMode);
          this.bus.emit({ type: 'MODE_CHANGED', from: mode, to: nextMode });
          mode = nextMode;
        }
        continue;
      }
      if (command.kind === 'UiMessage') {
        tx.touchRuntimeUi();
        tx.draftState.runtime.ui.messages.push(command.text);
      }
    }
  }

  private startFainting(mode: Mode, tx: ReturnType<StateStore['beginTx']>): void {
    if (tx.draftState.runtime.mode === 'FAINTING') return;
    const nextMode = this.modeMachine.forceMode('FAINTING');
    tx.touchRuntime();
    tx.touchRuntimeTime();
    tx.touchRuntimeFainting();
    tx.touchRuntimeUi();
    tx.draftState.runtime.mode = nextMode;
    tx.draftState.runtime.time.paused = true;
    tx.draftState.runtime.fainting = { active: true, phase: 'fadeOut', t: 0, restoreDone: false };
    tx.draftState.runtime.ui.messages.push('Your lantern dims...');
    this.bus.emit({ type: 'MODE_CHANGED', from: mode, to: nextMode });
  }

  private stepFainting(dtMs: number, tx: ReturnType<StateStore['beginTx']>): void {
    tx.touchRuntimeFainting();
    const faint = tx.draftState.runtime.fainting;
    if (!faint?.active) return;
    if (faint.phase === 'restore') {
      if (!faint.restoreDone) {
        const snapshot = tx.draftState.runtime.checkpoint.snapshot;
        if (snapshot) {
          this.checkpointSystem.restoreFromSnapshot(tx, snapshot);
          this.checkpointSystem.emitRestored(snapshot);
        }
        faint.restoreDone = true;
      }
      faint.phase = 'fadeIn';
      faint.t = 0;
      return;
    }
    faint.t = Math.min(1, faint.t + dtMs / FAINT_FADE_MS);
    if (faint.t >= 1 && faint.phase === 'fadeOut') {
      faint.phase = 'restore';
      faint.t = 0;
      return;
    }
    if (faint.t >= 1 && faint.phase === 'fadeIn') {
      tx.draftState.runtime.fainting = undefined;
      tx.draftState.runtime.mode = this.modeMachine.forceMode('EXPLORE');
      tx.draftState.runtime.time.paused = false;
      this.bus.emit({ type: 'MODE_CHANGED', from: 'FAINTING', to: 'EXPLORE' });
    }
  }

  private stepMapTransition(dtMs: number, tx: ReturnType<StateStore['beginTx']>): void {
    const transition = tx.draftState.runtime.map.transition;
    if (!transition) return;
    const result = advanceMapTransition(transition, dtMs);
    tx.draftState.runtime.map.transition = result.transition ?? undefined;
    if (result.shouldSwap) applyTransitionSwap(tx.draftState, transition);
    if (!result.transition) {
      tx.draftState.runtime.mode = this.modeMachine.requestMode(tx.draftState.runtime.mode, 'EXPLORE');
      tx.draftState.runtime.time.paused = false;
    }
  }

  private processPendingSaveControl(): void {
    if (!this.pendingSaveControl) return;
    const action = this.pendingSaveControl;
    this.pendingSaveControl = null;
    if (action.kind === 'manual_save') {
      this.saveSystem.markDirty('manual');
      this.saveSystem.requestAutosave('manual');
      return;
    }
    if (action.kind === 'load') return void this.saveSystem.loadNow();
    if (action.kind === 'new_game') return void this.saveSystem.newGame();
    this.saveSystem.newStory(action.storyId);
  }

  private ensureFallbackCheckpoint(tx: ReturnType<StateStore['beginTx']>): void {
    if (tx.draftState.runtime.checkpoint.snapshot) return;
    this.checkpointSystem.setCheckpoint(tx, 'fallback_start');
    this.checkpointSystem.snapshot(tx);
  }
}
