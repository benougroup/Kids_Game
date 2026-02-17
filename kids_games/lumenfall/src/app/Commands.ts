import type { EventBus } from './EventBus';
import type { Mode } from './ModeMachine';

export type RequestModeCommand = { kind: 'RequestMode'; nextMode: Mode };
export type UiMessageCommand = { kind: 'UiMessage'; text: string };
export type RequestMapTransitionCommand = {
  kind: 'RequestMapTransition';
  toMapId: string;
  toX: number;
  toY: number;
};
export type DebugSkipTimeCommand = { kind: 'DebugSkipTime'; seconds: number };
export type DebugToggleLightOverlayCommand = { kind: 'DebugToggleLightOverlay' };
export type DebugDamageCommand = { kind: 'DebugDamage'; amount: number; source: string };
export type DebugCheckpointCommand = { kind: 'DebugCheckpoint' };
export type TriggerFaintCommand = { kind: 'TriggerFaint' };

export type Command =
  | RequestModeCommand
  | UiMessageCommand
  | RequestMapTransitionCommand
  | DebugSkipTimeCommand
  | DebugToggleLightOverlayCommand
  | DebugDamageCommand
  | DebugCheckpointCommand
  | TriggerFaintCommand;

type CommandPriority = 1 | 2 | 3 | 4;

const commandPriority = (command: Command): CommandPriority => {
  if (command.kind === 'TriggerFaint') {
    return 1;
  }

  if (command.kind === 'RequestMode') {
    if (command.nextMode === 'FAINTING') {
      return 1;
    }

    if (command.nextMode === 'MAP_TRANSITION') {
      return 2;
    }

    if (command.nextMode === 'DIALOGUE' || command.nextMode === 'CRAFTING' || command.nextMode === 'INVENTORY') {
      return 3;
    }

    return 4;
  }

  if (command.kind === 'RequestMapTransition') {
    return 2;
  }

  return 3;
};

export class CommandQueue {
  private queued: Command[] = [];

  constructor(private readonly bus: EventBus) {}

  enqueue(command: Command): void {
    this.queued.push(command);
    this.bus.emit({ type: 'COMMAND_ENQUEUED', command });
  }

  drain(): Command[] {
    const drained = [...this.queued];
    this.queued.length = 0;
    drained.sort((a, b) => commandPriority(a) - commandPriority(b));
    return drained;
  }
}
