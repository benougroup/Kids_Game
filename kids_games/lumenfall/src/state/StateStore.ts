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
  touchRuntimeDialogue(): void;
  touchRuntimeShadows(): void;
  touchRuntimeFlags(): void;
  touchRuntimeInventoryUi(): void;
  touchRuntimeCrafting(): void;
  touchRuntimeTime(): void;
  touchRuntimeLight(): void;
  touchRuntimeCheckpoint(): void;
  touchRuntimeSave(): void;
  touchRuntimeFainting(): void;
  touchGlobal(): void;
  touchGlobalPlayer(): void;
  touchInventoryGlobal(): void;
  touchStory(): void;
  touchStoryFlags(): void;
  touchStoryInventory(): void;
  touchStoryShadows(): void;
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
      touchRuntimeDialogue: () => {
        touchRuntime();
        if (!touched.has('runtime.dialogue')) {
          draftState.runtime.dialogue = { ...draftState.runtime.dialogue };
          touched.add('runtime.dialogue');
        }
      },
      touchRuntimeShadows: () => {
        touchRuntime();
        if (!touched.has('runtime.shadows')) {
          draftState.runtime.shadows = {
            ...draftState.runtime.shadows,
            env: [...draftState.runtime.shadows.env],
            story: [...draftState.runtime.shadows.story],
          };
          touched.add('runtime.shadows');
        }
      },
      touchRuntimeFlags: () => {
        touchRuntime();
        if (!touched.has('runtime.runtimeFlags')) {
          draftState.runtime.runtimeFlags = { ...draftState.runtime.runtimeFlags };
          touched.add('runtime.runtimeFlags');
        }
      },
      touchRuntimeInventoryUi: () => {
        touchRuntime();
        if (!touched.has('runtime.inventoryUI')) {
          draftState.runtime.inventoryUI = { ...draftState.runtime.inventoryUI };
          touched.add('runtime.inventoryUI');
        }
      },
      touchRuntimeCrafting: () => {
        touchRuntime();
        if (!touched.has('runtime.crafting')) {
          draftState.runtime.crafting = { ...draftState.runtime.crafting };
          touched.add('runtime.crafting');
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
      touchRuntimeSave: () => {
        touchRuntime();
        if (!touched.has('runtime.save')) {
          draftState.runtime.save = { ...draftState.runtime.save };
          touched.add('runtime.save');
        }
      },
      touchRuntimeFainting: () => {
        touchRuntime();
        if (!touched.has('runtime.fainting')) {
          draftState.runtime.fainting = draftState.runtime.fainting ? { ...draftState.runtime.fainting } : undefined;
          touched.add('runtime.fainting');
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
          draftState.global.inventory = {
            items: Object.fromEntries(Object.entries(draftState.global.inventory.items).map(([id, stack]) => [id, { ...stack }])),
            nonStack: { ...draftState.global.inventory.nonStack },
          };
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
          draftState.story.storyInventory = {
            items: Object.fromEntries(Object.entries(draftState.story.storyInventory.items).map(([id, stack]) => [id, { ...stack }])),
            nonStack: { ...draftState.story.storyInventory.nonStack },
          };
          touched.add('story.storyInventory');
        }
      },
      touchStoryShadows: () => {
        touchStory();
        if (!touched.has('story.storyShadow')) {
          draftState.story.storyShadow = {
            ...draftState.story.storyShadow,
            byId: { ...draftState.story.storyShadow.byId },
          };
          touched.add('story.storyShadow');
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
