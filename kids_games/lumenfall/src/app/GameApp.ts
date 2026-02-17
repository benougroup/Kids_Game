import { CommandQueue, type Command } from './Commands';
import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { ModeMachine, type Mode } from './ModeMachine';
import { TILE_SIZE } from './Config';
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
  private readonly timeSystem = new TimeSystem({ bus: this.bus, modeMachine: this.modeMachine });
  private readonly lightSystem = new LightSystem({ mapSystem: this.mapSystem, bus: this.bus });
  private readonly camera = new Camera(WORLD_TILE_WIDTH * TILE_SIZE, WORLD_TILE_HEIGHT * TILE_SIZE);
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly loop: GameLoop;
  private showLightOverlay = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, this.camera, this.mapSystem, this.lightSystem);
    this.input = new Input(canvas, this.camera);
    this.loop = new GameLoop(this.update, this.render);

    this.bus.on('MODE_CHANGED', (event) => {
      this.logger.info(`Mode changed: ${event.from} -> ${event.to}`);
    });

    this.bus.on('TIME_PHASE_CHANGED', (event) => {
      const tx = this.store.beginTx('light_phase_sync');
      try {
        this.lightSystem.onTimePhaseChanged(event.to, tx);
        this.store.commitTx(tx);
      } catch (error) {
        this.store.rollbackTx(tx);
        this.logger.error('Light phase sync failed', error);
      }
    });

    const tx = this.store.beginTx('light_init');
    this.lightSystem.initialize(this.store.get(), tx);
    this.ensureFallbackCheckpoint(tx);
    this.store.commitTx(tx);
  }

  start(): void {
    this.loop.start();
  }

  private readonly update = (dtMs: number): void => {
    const state = this.store.get();
    const polled = this.input.poll(state.runtime.mode, state.runtime.player.x, state.runtime.player.y);

    for (const command of polled.commands) {
      this.commandQueue.enqueue(command);
    }

    const tx = this.store.beginTx('frame_update');

    try {
      const draft = tx.draftState;

      tx.touchRuntimeMap();
      tx.touchRuntimePlayer();
      tx.touchRuntimeCheckpoint();
      tx.touchRuntimeMapTriggerFlags();
      tx.touchRuntimeTime();
      tx.touchRuntimeSave();

      if (draft.runtime.mode === 'FAINTING') {
        this.stepFainting(dtMs, tx);
      } else if (draft.runtime.mode === 'MAP_TRANSITION') {
        this.stepMapTransition(dtMs, tx);
      } else {
        this.applyCommands(this.commandQueue.drain(), draft.runtime.mode, tx);
        if (tx.draftState.runtime.mode === 'FAINTING') {
          this.stepFainting(dtMs, tx);
        } else {
          this.timeSystem.update(dtMs, tx);
          const moveResult = this.playerSystem.applyMovementIntent(draft, polled.moveDx, polled.moveDy);
          this.triggerSystem.evaluate(tx, this.commandQueue, {
            movedTile: moveResult.movedTile,
            fromX: moveResult.fromX,
            fromY: moveResult.fromY,
            interactPressed: polled.interactPressed,
            nowMs: performance.now(),
          });
          this.applyCommands(this.commandQueue.drain(), tx.draftState.runtime.mode, tx);
        }
      }

      tx.draftState.runtime.save.blockedByFaint = tx.draftState.runtime.mode === 'FAINTING';
      this.lightSystem.update(tx);
      this.playerSystem.smoothPixels(draft, dtMs);
      this.store.commitTx(tx);
    } catch (error) {
      this.store.rollbackTx(tx);
      this.logger.error('Transaction failed', error);
    }
  };

  private readonly render = (): void => {
    this.renderer.setLightOverlayVisible(this.showLightOverlay);
    this.renderer.render(this.store.get(), this.loop.getFps());
  };

  private applyCommands(commands: Command[], currentMode: Mode, tx: ReturnType<StateStore['beginTx']>): void {
    let mode = currentMode;

    for (const command of commands) {
      if (command.kind === 'TriggerFaint') {
        this.startFainting(mode, tx);
        mode = tx.draftState.runtime.mode;
        continue;
      }

      if (command.kind === 'DebugDamage') {
        damage(tx, command.amount, command.source, { commandQueue: this.commandQueue });
        if (tx.draftState.runtime.player.hp <= 0) {
          this.startFainting(mode, tx);
          mode = tx.draftState.runtime.mode;
        }
        continue;
      }

      if (command.kind === 'DebugCheckpoint') {
        this.checkpointSystem.setCheckpoint(tx, `debug_${tx.draftState.runtime.map.currentMapId}_${tx.draftState.runtime.player.x}_${tx.draftState.runtime.player.y}`);
        this.checkpointSystem.snapshot(tx);
        tx.touchRuntimeUi();
        tx.draftState.runtime.ui.messages.push('Checkpoint saved.');
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
          tx.draftState.runtime.map.transition = {
            toMapId: command.toMapId,
            toX: command.toX,
            toY: command.toY,
            phase: 'fadeOut',
            t: 0,
          };
          this.bus.emit({ type: 'MODE_CHANGED', from: mode, to: nextMode });
          mode = nextMode;
        }
        continue;
      }

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
      }

      if (command.kind === 'UiMessage') {
        tx.touchRuntimeUi();
        tx.draftState.runtime.ui.messages.push(command.text);
        this.bus.emit({ type: 'UI_MESSAGE', text: command.text });
      }

      if (command.kind === 'DebugSkipTime') {
        this.timeSystem.debugSkipSeconds(command.seconds, tx);
      }

      if (command.kind === 'DebugToggleLightOverlay') {
        this.showLightOverlay = !this.showLightOverlay;
      }
    }
  }

  private startFainting(mode: Mode, tx: ReturnType<StateStore['beginTx']>): void {
    if (tx.draftState.runtime.mode === 'FAINTING') {
      return;
    }

    const nextMode = this.modeMachine.forceMode('FAINTING');
    tx.touchRuntime();
    tx.touchRuntimeTime();
    tx.touchRuntimeFainting();
    tx.touchRuntimeUi();

    tx.draftState.runtime.mode = nextMode;
    tx.draftState.runtime.time.paused = true;
    tx.draftState.runtime.fainting = {
      active: true,
      phase: 'fadeOut',
      t: 0,
      restoreDone: false,
    };
    tx.draftState.runtime.ui.messages.push('Your lantern dims...');
    this.bus.emit({ type: 'MODE_CHANGED', from: mode, to: nextMode });
  }

  private stepFainting(dtMs: number, tx: ReturnType<StateStore['beginTx']>): void {
    tx.touchRuntimeFainting();
    const faint = tx.draftState.runtime.fainting;
    if (!faint || !faint.active) {
      return;
    }

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
      const nextMode = this.modeMachine.forceMode('EXPLORE');
      tx.draftState.runtime.mode = nextMode;
      tx.draftState.runtime.time.paused = false;
      this.bus.emit({ type: 'MODE_CHANGED', from: 'FAINTING', to: nextMode });
    }
  }

  private stepMapTransition(dtMs: number, tx: ReturnType<StateStore['beginTx']>): void {
    const transition = tx.draftState.runtime.map.transition;
    if (!transition) {
      return;
    }

    const result = advanceMapTransition(transition, dtMs);
    tx.draftState.runtime.map.transition = result.transition ?? undefined;

    if (result.shouldSwap) {
      applyTransitionSwap(tx.draftState, transition);
    }

    if (!result.transition) {
      const nextMode = this.modeMachine.requestMode(tx.draftState.runtime.mode, 'EXPLORE');
      tx.draftState.runtime.mode = nextMode;
      tx.draftState.runtime.time.paused = false;
    }
  }

  private ensureFallbackCheckpoint(tx: ReturnType<StateStore['beginTx']>): void {
    if (tx.draftState.runtime.checkpoint.snapshot) {
      return;
    }

    this.checkpointSystem.setCheckpoint(tx, 'fallback_start');
    this.checkpointSystem.snapshot(tx);
  }
}
