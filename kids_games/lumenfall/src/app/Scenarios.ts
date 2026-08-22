/**
 * Landing Page & Scenario Selector
 *
 * Clean entry point for selecting game scenarios or testing ground
 */

export interface GameScenario {
  id: string;
  name: string;
  description: string;
  startMapId: string;
  startX: number;
  startY: number;
  category: 'gameplay' | 'testing';
}

export const SCENARIOS: GameScenario[] = [
  {
    id: 'campaign_main',
    name: 'Main Campaign',
    description: 'Start in the town. Full game experience.',
    startMapId: 'town',
    startX: 12,
    startY: 8,
    category: 'gameplay',
  },
  {
    id: 'village_start',
    name: 'Village Beginning',
    description: 'Begin in a small village settlement.',
    startMapId: 'village',
    startX: 10,
    startY: 7,
    category: 'gameplay',
  },
  {
    id: 'test_terrain_mechanics',
    name: 'Test: Terrain & Movement',
    description: 'Test map with various terrain types and movement mechanics.',
    startMapId: 'river',
    startX: 9,
    startY: 8,
    category: 'testing',
  },
  {
    id: 'test_map_objects',
    name: 'Test: Map Objects & Cutouts',
    description: 'Test terrain cutouts, buildings, and static objects placement.',
    startMapId: 'town',
    startX: 12,
    startY: 8,
    category: 'testing',
  },
  {
    id: 'test_portal_network',
    name: 'Test: Portal Connectivity',
    description: 'Test all portals and transitions between maps.',
    startMapId: 'town',
    startX: 12,
    startY: 8,
    category: 'testing',
  },
  {
    id: 'test_sprite_gallery',
    name: 'Test: Sprite Gallery',
    description: 'Visual test of all available sprites and assets.',
    startMapId: 'manus_sprite_test',
    startX: 10,
    startY: 6,
    category: 'testing',
  },
];

export function getScenarioById(id: string): GameScenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function getScenariosByCategory(category: 'gameplay' | 'testing'): GameScenario[] {
  return SCENARIOS.filter(s => s.category === category);
}
