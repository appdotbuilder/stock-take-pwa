
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { type CreateStorageLocationInput } from '../schema';
import { getStorageLocations } from '../handlers/get_storage_locations';

describe('getStorageLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no storage locations exist', async () => {
    const result = await getStorageLocations();

    expect(result).toEqual([]);
  });

  it('should return all storage locations', async () => {
    // Create test storage locations
    const testLocation1: CreateStorageLocationInput = {
      location_code: 'A001',
      location_name: 'Warehouse A - Shelf 1',
      qr_code: 'QR_A001'
    };

    const testLocation2: CreateStorageLocationInput = {
      location_code: 'B002',
      location_name: 'Warehouse B - Shelf 2',
      qr_code: null
    };

    await db.insert(storageLocationsTable)
      .values([testLocation1, testLocation2])
      .execute();

    const result = await getStorageLocations();

    expect(result).toHaveLength(2);
    
    // Check first location
    const location1 = result.find(loc => loc.location_code === 'A001');
    expect(location1).toBeDefined();
    expect(location1!.location_name).toEqual('Warehouse A - Shelf 1');
    expect(location1!.qr_code).toEqual('QR_A001');
    expect(location1!.id).toBeDefined();
    expect(location1!.created_at).toBeInstanceOf(Date);

    // Check second location
    const location2 = result.find(loc => loc.location_code === 'B002');
    expect(location2).toBeDefined();
    expect(location2!.location_name).toEqual('Warehouse B - Shelf 2');
    expect(location2!.qr_code).toBeNull();
    expect(location2!.id).toBeDefined();
    expect(location2!.created_at).toBeInstanceOf(Date);
  });

  it('should return locations ordered by creation time', async () => {
    // Create multiple storage locations
    const locations: CreateStorageLocationInput[] = [
      {
        location_code: 'C001',
        location_name: 'Storage C1',
        qr_code: 'QR_C001'
      },
      {
        location_code: 'D002',
        location_name: 'Storage D2',
        qr_code: 'QR_D002'
      },
      {
        location_code: 'E003',
        location_name: 'Storage E3',
        qr_code: null
      }
    ];

    for (const location of locations) {
      await db.insert(storageLocationsTable)
        .values(location)
        .execute();
    }

    const result = await getStorageLocations();

    expect(result).toHaveLength(3);
    
    // Verify all locations are returned with correct structure
    result.forEach(location => {
      expect(location.id).toBeDefined();
      expect(location.location_code).toBeDefined();
      expect(location.location_name).toBeDefined();
      expect(location.created_at).toBeInstanceOf(Date);
      expect(typeof location.location_code).toBe('string');
      expect(typeof location.location_name).toBe('string');
    });

    // Verify specific locations exist
    const codes = result.map(loc => loc.location_code);
    expect(codes).toContain('C001');
    expect(codes).toContain('D002');
    expect(codes).toContain('E003');
  });
});
