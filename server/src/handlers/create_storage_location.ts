
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { type CreateStorageLocationInput, type StorageLocation } from '../schema';

export const createStorageLocation = async (input: CreateStorageLocationInput): Promise<StorageLocation> => {
  try {
    // Insert storage location record
    const result = await db.insert(storageLocationsTable)
      .values({
        location_code: input.location_code,
        location_name: input.location_name,
        qr_code: input.qr_code
      })
      .returning()
      .execute();

    // Return the created storage location
    return result[0];
  } catch (error) {
    console.error('Storage location creation failed:', error);
    throw error;
  }
};
