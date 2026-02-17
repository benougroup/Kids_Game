import encountersJson from '../data/encounters.json';

interface EncounterNode { id: string }
interface EncounterFileShape { nodes: EncounterNode[] }

export class EncounterDatabase {
  private readonly ids = new Set<string>();

  constructor(raw: EncounterFileShape = encountersJson as EncounterFileShape) {
    for (const node of raw.nodes) this.ids.add(node.id);
  }

  hasTemplate(templateId: string): boolean {
    return this.ids.has(templateId);
  }
}

export const encounterDatabase = new EncounterDatabase();
