import type { Mode } from './ModeMachine';
import type { Command } from './Commands';

export type AppEvent =
  | { type: 'MODE_CHANGED'; from: Mode; to: Mode }
  | { type: 'UI_MESSAGE'; text: string }
  | { type: 'COMMAND_ENQUEUED'; command: Command };

type HandlerMap = {
  [K in AppEvent['type']]: Array<(event: Extract<AppEvent, { type: K }>) => void>;
};

export class EventBus {
  private listeners: HandlerMap = {
    MODE_CHANGED: [],
    UI_MESSAGE: [],
    COMMAND_ENQUEUED: [],
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
