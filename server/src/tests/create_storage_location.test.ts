
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { type CreateStorageLocationInput } from '../schema';
import { createStorageLocation } from '../handlers/create_storage_location';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateStorageLocationInput = {
  location_code: 'WH-A-01',
  location_name: 'Warehouse A Section 1',
  qr_code: 'QR12345'
};

// Test input without optional field
const testInputMinimal: CreateStorageLocationInput = {
  location_code: 'WH-B-01',
  location_name: 'Warehouse B Section 1',
  qr_code: null
};

describe('createStorageLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a storage location with all fields', async () => {
    const result = await createStorageLocation(testInput);

    // Basic field validation
    expect(result.location_code).toEqual('WH-A-01');
    expect(result.location_name).toEqual('Warehouse A Section 1');
    expect(result.qr_code).toEqual('QR12345');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a storage location without qr_code', async () => {
    const result = await createStorageLocation(testInputMinimal);

    // Basic field validation
    expect(result.location_code).toEqual('WH-B-01');
    expect(result.location_name).toEqual('Warehouse B Section 1');
    expect(result.qr_code).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save storage location to database', async () => {
    const result = await createStorageLocation(testInput);

    // Query using proper drizzle syntax
    const locations = await db.select()
      .from(storageLocationsTable)
      .where(eq(storageLocationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].location_code).toEqual('WH-A-01');
    expect(locations[0].location_name).toEqual('Warehouse A Section 1');
    expect(locations[0].qr_code).toEqual('QR12345');
    expect(locations[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique location_code constraint', async () => {
    // Create first storage location
    await createStorageLocation(testInput);

    // Try to create another with same location_code
    const duplicateInput: CreateStorageLocationInput = {
      location_code: 'WH-A-01', // Same as testInput
      location_name: 'Different Name',
      qr_code: null
    };

    // Should throw error due to unique constraint
    await expect(createStorageLocation(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should enforce unique qr_code constraint when provided', async () => {
    // Create first storage location with qr_code
    await createStorageLocation(testInput);

    // Try to create another with same qr_code
    const duplicateQrInput: CreateStorageLocationInput = {
      location_code: 'WH-C-01',
      location_name: 'Different Location',
      qr_code: 'QR12345' // Same as testInput
    };

    // Should throw error due to unique constraint
    await expect(createStorageLocation(duplicateQrInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});
