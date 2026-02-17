import { validateInvariants } from './Invariants';
import { createInitialState, type GameState } from './StateTypes';

export interface DraftTx {
  readonly reason: string;
  draftState: GameState;
  touchedSlices: Set<string>;
  touchRuntime(): void;
  touchRuntimePlayer(): void;
  touchRuntimeMap(): void;
  touchRuntimeMapTriggerFlags(): void;
  touchRuntimeUi(): void;
  touchRuntimeTime(): void;
  touchRuntimeLight(): void;
  touchRuntimeCheckpoint(): void;
  touchGlobal(): void;
  touchGlobalPlayer(): void;
  touchInventoryGlobal(): void;
  touchStory(): void;
  touchStoryFlags(): void;
  touchStoryInventory(): void;
}

export class StateStore {
  private state: GameState;

  constructor(initialState: GameState = createInitialState()) {
    this.state = initialState;
  }

  get(): Readonly<GameState> {
    return this.state;
  }

  beginTx(reason: string): DraftTx {
    const draftState: GameState = { ...this.state };
    const touched = new Set<string>();

    const touchGlobal = (): void => {
      if (!touched.has('global')) {
        draftState.global = { ...draftState.global };
        touched.add('global');
      }
    };

    const touchStory = (): void => {
      if (!touched.has('story')) {
        draftState.story = { ...draftState.story };
        touched.add('story');
      }
    };

    const touchRuntime = (): void => {
      if (!touched.has('runtime')) {
        draftState.runtime = { ...draftState.runtime };
        touched.add('runtime');
      }
    };

    return {
      reason,
      draftState,
      touchedSlices: touched,
      touchRuntime,
      touchRuntimePlayer: () => {
        touchRuntime();
        if (!touched.has('runtime.player')) {
          draftState.runtime.player = { ...draftState.runtime.player };
          touched.add('runtime.player');
        }
      },
      touchRuntimeMap: () => {
        touchRuntime();
        if (!touched.has('runtime.map')) {
          draftState.runtime.map = {
            ...draftState.runtime.map,
            mapsVisited: { ...draftState.runtime.map.mapsVisited },
            transition: draftState.runtime.map.transition ? { ...draftState.runtime.map.transition } : undefined,
          };
          touched.add('runtime.map');
        }
      },
      touchRuntimeMapTriggerFlags: () => {
        touchRuntime();
        if (!touched.has('runtime.mapTriggerFlags')) {
          draftState.runtime.mapTriggerFlags = Object.fromEntries(
            Object.entries(draftState.runtime.mapTriggerFlags).map(([mapId, flags]) => [mapId, { ...flags }]),
          );
          touched.add('runtime.mapTriggerFlags');
        }
      },
      touchRuntimeUi: () => {
        touchRuntime();
        if (!touched.has('runtime.ui')) {
          draftState.runtime.ui = { ...draftState.runtime.ui, messages: [...draftState.runtime.ui.messages] };
          touched.add('runtime.ui');
        }
      },
      touchRuntimeTime: () => {
        touchRuntime();
        if (!touched.has('runtime.time')) {
          draftState.runtime.time = { ...draftState.runtime.time };
          touched.add('runtime.time');
        }
      },
      touchRuntimeCheckpoint: () => {
        touchRuntime();
        if (!touched.has('runtime.checkpoint')) {
          draftState.runtime.checkpoint = { ...draftState.runtime.checkpoint };
          touched.add('runtime.checkpoint');
        }
      },
      touchRuntimeLight: () => {
        touchRuntime();
        if (!touched.has('runtime.light')) {
          draftState.runtime.light = {
            ...draftState.runtime.light,
            sources: { ...draftState.runtime.light.sources },
          };
          touched.add('runtime.light');
        }
      },
      touchGlobal,
      touchGlobalPlayer: () => {
        touchGlobal();
        if (!touched.has('global.player')) {
          draftState.global.player = {
            ...draftState.global.player,
            permanentTools: { ...draftState.global.player.permanentTools },
            upgrades: { ...draftState.global.player.upgrades },
          };
          touched.add('global.player');
        }
      },
      touchInventoryGlobal: () => {
        touchGlobal();
        if (!touched.has('global.inventory')) {
          draftState.global.inventory = { ...draftState.global.inventory };
          touched.add('global.inventory');
        }
      },
      touchStory,
      touchStoryFlags: () => {
        touchStory();
        if (!touched.has('story.flags')) {
          draftState.story.flags = { ...draftState.story.flags };
          touched.add('story.flags');
        }
      },
      touchStoryInventory: () => {
        touchStory();
        if (!touched.has('story.storyInventory')) {
          draftState.story.storyInventory = { ...draftState.story.storyInventory };
          touched.add('story.storyInventory');
        }
      },
    };
  }

  commitTx(tx: DraftTx): void {
    validateInvariants(tx.draftState);
    this.state = tx.draftState;
  }

  rollbackTx(tx: DraftTx): void {
    tx.touchedSlices.clear();
  }
}
