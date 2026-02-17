import demoScenesJson from '../data/scenes/demo.scenes.json';

export type SceneText = string | string[];

export interface SceneConditions {
  flags?: Record<string, boolean>;
  notFlags?: Record<string, boolean>;
  hasItem?: { scope: 'global' | 'story'; itemId: string; qty: number };
  minSP?: number;
  minHP?: number;
  timePhaseIn?: Array<'DAY' | 'DUSK' | 'NIGHT' | 'DAWN'>;
  trustAtLeast?: { npcId: string; value: number };
}

export type SceneEffectOp =
  | { op: 'hp.delta'; value: number }
  | { op: 'sp.delta'; value: number }
  | { op: 'inventory.add' | 'inventory.remove'; itemId: string; qty: number; scope?: 'global' | 'story' }
  | { op: 'flag.set'; key: string; value: boolean }
  | { op: 'checkpoint.set'; checkpointId: string }
  | { op: 'checkpoint.snapshot' }
  | { op: 'crafting.open' }
  | { op: 'encounter.start'; templateId: string }
  | { op: 'map.teleport'; x: number; y: number }
  | { op: 'ui.message'; text: string }
  | { op: 'time.pause' | 'time.resume' }
  | { op: 'status.add'; statusId: string; durationSeconds?: number }
  | { op: 'areaEffect.cleanseShadows'; radius: number; filter?: string };

export interface SceneChoice {
  label: string;
  next: string | 'returnToMap';
  conditions?: SceneConditions;
  failNext?: string;
  effects?: SceneEffectOp[];
}

export interface SceneNode {
  id: string;
  type: 'scene';
  text: SceneText;
  speaker?: string;
  conditions?: SceneConditions;
  onEnterEffects?: SceneEffectOp[];
  choices: SceneChoice[];
}

interface SceneFileShape {
  nodes: SceneNode[];
}

const sceneFileRegistry: Record<string, SceneFileShape> = {
  'scenes/demo.scenes.json': demoScenesJson as SceneFileShape,
};

const makeErrorNode = (message: string): SceneNode => ({
  id: '__error__',
  type: 'scene',
  text: [`Dialogue error: ${message}`, 'Tap to return to map.'],
  choices: [{ label: 'Return', next: 'returnToMap' }],
});

export class SceneDatabase {
  private readonly byId = new Map<string, SceneNode>();
  readonly errors: string[] = [];

  constructor(scenesFile: string) {
    const raw = sceneFileRegistry[scenesFile];
    if (!raw) {
      this.errors.push(`Scene file not found: ${scenesFile}`);
      return;
    }

    for (const node of raw.nodes) {
      if (this.byId.has(node.id)) {
        this.errors.push(`Duplicate scene id: ${node.id}`);
        continue;
      }
      this.byId.set(node.id, node);
    }

    for (const node of raw.nodes) {
      for (const choice of node.choices ?? []) {
        if (choice.next !== 'returnToMap' && !this.byId.has(choice.next)) {
          this.errors.push(`Missing next node '${choice.next}' in node '${node.id}'`);
        }
        if (choice.failNext && !this.byId.has(choice.failNext)) {
          this.errors.push(`Missing failNext node '${choice.failNext}' in node '${node.id}'`);
        }
      }
    }
  }

  getNode(nodeId: string): SceneNode {
    return this.byId.get(nodeId) ?? makeErrorNode(`missing node '${nodeId}'`);
  }

  hasNode(nodeId: string): boolean {
    return this.byId.has(nodeId);
  }

  listNodeIds(): string[] {
    return [...this.byId.keys()];
  }
}
