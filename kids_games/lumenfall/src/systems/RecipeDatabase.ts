import recipesJson from '../data/recipes.json';
import { itemDatabase } from './ItemDatabase';

export interface RecipeDef {
  id: string;
  outputItemId: string;
  inputs: [string, string];
}

interface RecipeDbShape {
  version: number;
  recipes: RecipeDef[];
}

const pairKey = (a: string, b: string): string => [a, b].sort().join('|');

export class RecipeDatabase {
  readonly version: number;
  private readonly byPair = new Map<string, RecipeDef>();

  constructor(raw: RecipeDbShape = recipesJson as RecipeDbShape) {
    this.version = raw.version;
    for (const recipe of raw.recipes) {
      this.byPair.set(pairKey(recipe.inputs[0], recipe.inputs[1]), recipe);
    }
    this.validate(raw.recipes);
  }

  match(inputs: [string, string]): RecipeDef | null {
    return this.byPair.get(pairKey(inputs[0], inputs[1])) ?? null;
  }

  validate(recipes: RecipeDef[]): void {
    for (const recipe of recipes) {
      if (recipe.inputs.length !== 2) throw new Error(`Recipe ${recipe.id} must have exactly 2 inputs`);
      for (const itemId of recipe.inputs) {
        const item = itemDatabase.getItem(itemId);
        if (!item || item.category !== 'ingredients') throw new Error(`Recipe ${recipe.id} has invalid ingredient ${itemId}`);
      }
      if (!itemDatabase.getItem(recipe.outputItemId)) throw new Error(`Recipe ${recipe.id} has invalid output`);
    }
  }
}

export const recipeDatabase = new RecipeDatabase();
