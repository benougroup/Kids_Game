import { CURRENT_SAVE_VERSION, type SaveFile } from './SaveTypes';

type MigrationFn = (save: SaveFile) => SaveFile;

const migrations: Record<number, MigrationFn> = {
  1: (save) => save,
};

export const migrateSaveFile = (input: SaveFile): SaveFile => {
  if (!Number.isInteger(input.saveVersion) || input.saveVersion < 1) {
    throw new Error('Unsupported save version');
  }

  let current = input;
  for (let version = input.saveVersion; version <= CURRENT_SAVE_VERSION; version += 1) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`Missing migration for save version ${version}`);
    }
    current = migration(current);
  }

  return { ...current, saveVersion: CURRENT_SAVE_VERSION };
};
