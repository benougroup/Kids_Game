export interface ItemGraphicDefinition {
  key: string;
  path: string;
}

const ITEM_GRAPHICS_BY_NAME: Record<string, ItemGraphicDefinition> = {
  Torch: { key: 'item_torch', path: 'assets/sprites/props/street/wall_torch/wall_torch.png' },
  'Practice Sword': { key: 'item_sword_iron', path: 'assets/sprites/equipment/sword_iron/icon.png' },
  'Lantern Oil': { key: 'item_potion_mana', path: 'assets/sprites/items/potion_mana/icon.png' },
  'Healing Apple': { key: 'item_apple', path: 'assets/sprites/items/apple/icon.png' },
  'Magic Stone': { key: 'item_stone_magic', path: 'assets/sprites/items/stone_magic/icon.png' },
  'Coin Pouch': { key: 'item_coin_pouch', path: 'assets/sprites/items/coin_pouch/icon.png' },
  'Iron Key': { key: 'item_key_iron', path: 'assets/sprites/items/key_iron/icon.png' },
  'Bone Charm': { key: 'item_scroll_magic', path: 'assets/sprites/items/scroll_magic/icon.png' },
  'Red Gem': { key: 'item_gem_red', path: 'assets/sprites/items/gem_red/icon.png' },
  Sunleaf: { key: 'item_gem_green', path: 'assets/sprites/items/gem_green/icon.png' },
  'Glow Moth Dust': { key: 'item_gem_blue', path: 'assets/sprites/items/gem_blue/icon.png' },
  'Forest Herb': { key: 'item_mushroom', path: 'assets/sprites/items/mushroom/icon.png' },
  'Crystal Water': { key: 'item_potion_health', path: 'assets/sprites/items/potion_health/icon.png' },
};

export function getItemGraphic(itemName: string): ItemGraphicDefinition | undefined {
  return ITEM_GRAPHICS_BY_NAME[itemName];
}

export function getItemGraphicLoads(): ItemGraphicDefinition[] {
  const byKey = new Map<string, ItemGraphicDefinition>();
  for (const graphic of Object.values(ITEM_GRAPHICS_BY_NAME)) {
    byKey.set(graphic.key, graphic);
  }
  return [...byKey.values()];
}
