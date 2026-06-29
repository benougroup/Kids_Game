import type { Mode } from './ModeMachine';
import type { Command } from './Commands';
import type { TimePhase } from '../systems/TimeSystem';

export type AppEvent =
  | { type: 'MODE_CHANGED'; from: Mode; to: Mode }
  | { type: 'UI_MESSAGE'; text: string }
  | { type: 'COMMAND_ENQUEUED'; command: Command }
  | { type: 'DAY_START'; dayCount: number }
  | { type: 'TIME_PHASE_CHANGED'; from: TimePhase; to: TimePhase }
  | { type: 'TIME_PHASE_START'; phase: TimePhase }
  | { type: 'TIME_TICK'; atSeconds: number }
  | { type: 'LIGHT_AMBIENT_CHANGED'; phase: TimePhase; ambientShift: number }
  | { type: 'LIGHT_SOURCES_CHANGED' }
  | { type: 'CHECKPOINT_CREATED'; checkpointId: string }
  | { type: 'CHECKPOINT_SNAPSHOT'; checkpointId: string }
  | { type: 'CHECKPOINT_RESTORED'; checkpointId: string; mapId: string }
  | { type: 'CRAFT_SUCCESS'; recipeOutputItemId: string }
  | { type: 'STORY_FLAGS_CHANGED'; keys: string[] }
  | { type: 'INGREDIENT_COLLECTED'; itemId: string; x: number; y: number }
  | { type: 'AREA_EFFECT'; kind: 'cleanseShadows'; radius: number; filter: string };

type HandlerMap = {
  [K in AppEvent['type']]: Array<(event: Extract<AppEvent, { type: K }>) => void>;
};

export class EventBus {
  private listeners: HandlerMap = {
    MODE_CHANGED: [],
    UI_MESSAGE: [],
    COMMAND_ENQUEUED: [],
    DAY_START: [],
    TIME_PHASE_CHANGED: [],
    TIME_PHASE_START: [],
    TIME_TICK: [],
    LIGHT_AMBIENT_CHANGED: [],
    LIGHT_SOURCES_CHANGED: [],
    CHECKPOINT_CREATED: [],
    CHECKPOINT_SNAPSHOT: [],
    CHECKPOINT_RESTORED: [],
    CRAFT_SUCCESS: [],
    STORY_FLAGS_CHANGED: [],
    INGREDIENT_COLLECTED: [],
    AREA_EFFECT: [],
  };

  on<K extends AppEvent['type']>(
    type: K,
    handler: (event: Extract<AppEvent, { type: K }>) => void,
  ): () => void {
    const typedBucket = this.listeners[type] as Array<(event: Extract<AppEvent, { type: K }>) => void>;
    typedBucket.push(handler);

    return () => {
      const idx = typedBucket.indexOf(handler);
      if (idx >= 0) {
        typedBucket.splice(idx, 1);
      }
    };
  }

  emit<K extends AppEvent['type']>(event: Extract<AppEvent, { type: K }>): void {
    const typedBucket = this.listeners[event.type] as Array<(value: Extract<AppEvent, { type: K }>) => void>;
    for (const handler of typedBucket) {
      handler(event);
    }
  }
}
