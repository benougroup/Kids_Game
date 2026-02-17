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

const WORLD_TILE_WIDTH = 100;
const WORLD_TILE_HEIGHT = 100;

export class GameApp {
  private readonly store = new StateStore();
  private readonly bus = new EventBus();
  private readonly modeMachine = new ModeMachine();
  private readonly logger = new Logger();
  private readonly commandQueue = new CommandQueue(this.bus);
  private readonly mapSystem = new MapSystem();
  private readonly playerSystem = new PlayerSystem(this.mapSystem);
  private readonly triggerSystem = new TriggerSystem(this.mapSystem);
  private readonly timeSystem = new TimeSystem({ bus: this.bus, modeMachine: this.modeMachine });
  private readonly camera = new Camera(WORLD_TILE_WIDTH * TILE_SIZE, WORLD_TILE_HEIGHT * TILE_SIZE);
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, this.camera, this.mapSystem);
    this.input = new Input(canvas, this.camera);
    this.loop = new GameLoop(this.update, this.render);

    this.bus.on('MODE_CHANGED', (event) => {
      this.logger.info(`Mode changed: ${event.from} -> ${event.to}`);
    });
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

      if (draft.runtime.mode === 'MAP_TRANSITION') {
        this.stepMapTransition(dtMs, tx);
      } else {
        this.applyCommands(this.commandQueue.drain(), draft.runtime.mode, tx);
        this.timeSystem.update(dtMs, tx);
        const moveResult = this.playerSystem.applyMovementIntent(draft, polled.moveDx, polled.moveDy);
        this.triggerSystem.evaluate(draft, this.commandQueue, {
          movedTile: moveResult.movedTile,
          fromX: moveResult.fromX,
          fromY: moveResult.fromY,
          interactPressed: polled.interactPressed,
          nowMs: performance.now(),
        });
        this.applyCommands(this.commandQueue.drain(), draft.runtime.mode, tx);
      }

      this.playerSystem.smoothPixels(draft, dtMs);
      this.store.commitTx(tx);
    } catch (error) {
      this.store.rollbackTx(tx);
      this.logger.error('Transaction failed', error);
    }
  };

  private readonly render = (): void => {
    this.renderer.render(this.store.get(), this.loop.getFps());
  };

  private applyCommands(commands: Command[], currentMode: Mode, tx: ReturnType<StateStore['beginTx']>): void {
    let mode = currentMode;

    for (const command of commands) {
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
}
