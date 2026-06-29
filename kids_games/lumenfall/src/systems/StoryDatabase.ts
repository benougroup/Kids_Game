import storiesJson from '../data/stories.json';
import { SceneDatabase } from './SceneDatabase';

interface StoryDef {
  id: string;
  startSceneId: string;
  scenesFile: string;
}

interface StoriesFileShape {
  stories: StoryDef[];
}

export class StoryDatabase {
  private readonly stories = new Map<string, StoryDef>();
  private readonly sceneDbs = new Map<string, SceneDatabase>();

  constructor(raw: StoriesFileShape = storiesJson as StoriesFileShape) {
    for (const story of raw.stories) {
      this.stories.set(story.id, story);
      const sceneDb = new SceneDatabase(story.scenesFile);
      this.sceneDbs.set(story.id, sceneDb);
      for (const err of sceneDb.errors) {
        console.error(`[SceneDatabase:${story.id}] ${err}`);
      }
    }
  }

  getStory(storyId: string): StoryDef | undefined {
    return this.stories.get(storyId);
  }

  getSceneDatabase(storyId: string): SceneDatabase | undefined {
    return this.sceneDbs.get(storyId);
  }
}

export const storyDatabase = new StoryDatabase();
