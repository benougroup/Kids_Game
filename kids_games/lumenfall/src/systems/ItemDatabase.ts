import itemsJson from '../data/items.json';

export type ItemCategory = 'potions' | 'ingredients' | 'tools' | 'storyKeys';

type EffectOp =
  | { op: 'hp.delta'; value: number }
  | { op: 'sp.delta'; value: number }
  | { op: 'status.add'; statusId: string; durationSeconds?: number }
  | { op: 'ui.message'; text: string }
  | { op: 'inventory.add' | 'inventory.remove'; itemId: string; qty: number }
  | { op: 'areaEffect.cleanseShadows'; radius: number; filter?: string };

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  stackable: boolean;
  maxStack?: number;
  effects?: EffectOp[];
}

interface ItemDbShape {
  version: number;
  items: ItemDef[];
}

export class ItemDatabase {
  readonly version: number;
  private readonly byId = new Map<string, ItemDef>();

  constructor(raw: ItemDbShape = itemsJson as ItemDbShape) {
    this.version = raw.version;
    for (const item of raw.items) {
      this.byId.set(item.id, item);
    }
    this.validateIds();
  }

  getItem(id: string): ItemDef | undefined {
    return this.byId.get(id);
  }

  listByCategory(category: ItemCategory | 'all'): ItemDef[] {
    return [...this.byId.values()].filter((item) => category === 'all' || item.category === category);
  }

  validateIds(): void {
    const ids = [...this.byId.keys()];
    if (new Set(ids).size !== ids.length) {
      throw new Error('Duplicate item IDs in items.json');
    }
  }
}

export const itemDatabase = new ItemDatabase();
