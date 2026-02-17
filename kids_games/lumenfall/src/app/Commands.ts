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
export type ToggleInventoryCommand = { kind: 'ToggleInventory' };
export type InventoryUseSelectedCommand = { kind: 'InventoryUseSelected' };
export type InventorySelectItemCommand = { kind: 'InventorySelectItem'; itemId: string };
export type CraftingSetSlotCommand = { kind: 'CraftingSetSlot'; slot: 'A' | 'B'; itemId: string };
export type CraftingMixCommand = { kind: 'CraftingMix' };
export type CraftingCloseCommand = { kind: 'CraftingClose' };
export type StartSceneCommand = { kind: 'StartScene'; storyId: string; sceneId?: string };
export type DialogueChooseCommand = { kind: 'DialogueChoose'; choiceIndex: number };
export type StartEncounterCommand = { kind: 'StartEncounter'; templateId: string };
export type SaveNowCommand = { kind: 'SaveNow' };
export type LoadNowCommand = { kind: 'LoadNow' };
export type NewGameCommand = { kind: 'NewGame' };
export type NewStoryCommand = { kind: 'NewStory'; storyId: string };
export type TogglePerfHudCommand = { kind: 'TogglePerfHud' };

export type Command =
  | RequestModeCommand
  | UiMessageCommand
  | RequestMapTransitionCommand
  | DebugSkipTimeCommand
  | DebugToggleLightOverlayCommand
  | DebugDamageCommand
  | DebugCheckpointCommand
  | TriggerFaintCommand
  | ToggleInventoryCommand
  | InventoryUseSelectedCommand
  | InventorySelectItemCommand
  | CraftingSetSlotCommand
  | CraftingMixCommand
  | CraftingCloseCommand
  | StartSceneCommand
  | DialogueChooseCommand
  | StartEncounterCommand
  | SaveNowCommand
  | LoadNowCommand
  | NewGameCommand
  | NewStoryCommand
  | TogglePerfHudCommand;

type CommandPriority = 1 | 2 | 3 | 4 | 5 | 6;

const commandPriority = (command: Command): CommandPriority => {
  if (command.kind === 'TriggerFaint') return 1;
  if (command.kind === 'DebugDamage') return 1;
  if (command.kind === 'RequestMode') {
    if (command.nextMode === 'FAINTING') return 1;
    if (command.nextMode === 'MAP_TRANSITION') return 2;
    if (command.nextMode === 'DIALOGUE') return 3;
    if (command.nextMode === 'CRAFTING' || command.nextMode === 'INVENTORY') return 4;
    if (command.nextMode === 'MENU') return 5;
    return 6;
  }
  if (command.kind === 'RequestMapTransition') return 2;
  if (command.kind === 'StartScene' || command.kind === 'StartEncounter' || command.kind === 'DialogueChoose') return 3;
  if (command.kind === 'ToggleInventory' || command.kind === 'InventorySelectItem' || command.kind === 'InventoryUseSelected' || command.kind === 'CraftingSetSlot' || command.kind === 'CraftingMix' || command.kind === 'CraftingClose') return 4;
  if (command.kind === 'UiMessage' || command.kind === 'TogglePerfHud') return 6;
  return 5;
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
