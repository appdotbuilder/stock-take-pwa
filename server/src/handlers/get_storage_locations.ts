
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { type StorageLocation } from '../schema';

export const getStorageLocations = async (): Promise<StorageLocation[]> => {
  try {
    const results = await db.select()
      .from(storageLocationsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get storage locations:', error);
    throw error;
  }
};
