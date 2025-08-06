
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { partsTable, projectsTable, storageLocationsTable } from '../db/schema';
import { type UpdatePartInput, type CreateProjectInput, type CreateStorageLocationInput } from '../schema';
import { updatePartQuantities } from '../handlers/update_part_quantities';
import { eq } from 'drizzle-orm';

describe('updatePartQuantities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProjectId: number;
  let testLocationId: number;
  let testPartId: number;

  beforeEach(async () => {
    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A project for testing'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create prerequisite storage location
    const locationResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'LOC001',
        location_name: 'Test Location',
        qr_code: 'QR001'
      })
      .returning()
      .execute();
    testLocationId = locationResult[0].id;

    // Create test part
    const partResult = await db.insert(partsTable)
      .values({
        no: 'P001',
        part: 'Test Part',
        std_pack: '10.50',
        project_id: testProjectId,
        part_name: 'Test Part Name',
        part_number: 'TPN001',
        storage_location_id: testLocationId,
        supplier_code: 'SUP001',
        supplier_name: 'Test Supplier',
        type: 'Type A',
        image: null,
        qty_std: 100,
        qty_sisa: 80,
        remark: 'Initial remark'
      })
      .returning()
      .execute();
    testPartId = partResult[0].id;
  });

  it('should update qty_std only', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_std: 150
    };

    const result = await updatePartQuantities(input);

    expect(result.id).toEqual(testPartId);
    expect(result.qty_std).toEqual(150);
    expect(result.qty_sisa).toEqual(80); // Should remain unchanged
    expect(result.remark).toEqual('Initial remark'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.std_pack).toBe('number');
    expect(result.std_pack).toEqual(10.5);
  });

  it('should update qty_sisa only', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_sisa: 60
    };

    const result = await updatePartQuantities(input);

    expect(result.id).toEqual(testPartId);
    expect(result.qty_std).toEqual(100); // Should remain unchanged
    expect(result.qty_sisa).toEqual(60);
    expect(result.remark).toEqual('Initial remark'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update remark only', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      remark: 'Updated remark'
    };

    const result = await updatePartQuantities(input);

    expect(result.id).toEqual(testPartId);
    expect(result.qty_std).toEqual(100); // Should remain unchanged
    expect(result.qty_sisa).toEqual(80); // Should remain unchanged
    expect(result.remark).toEqual('Updated remark');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update all fields together', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_std: 200,
      qty_sisa: 150,
      remark: 'All updated'
    };

    const result = await updatePartQuantities(input);

    expect(result.id).toEqual(testPartId);
    expect(result.qty_std).toEqual(200);
    expect(result.qty_sisa).toEqual(150);
    expect(result.remark).toEqual('All updated');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set remark to null when provided', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_std: 120,
      remark: null
    };

    const result = await updatePartQuantities(input);

    expect(result.id).toEqual(testPartId);
    expect(result.qty_std).toEqual(120);
    expect(result.remark).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_std: 300,
      qty_sisa: 250,
      remark: 'Database test'
    };

    await updatePartQuantities(input);

    // Verify changes in database
    const parts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.id, testPartId))
      .execute();

    expect(parts).toHaveLength(1);
    const part = parts[0];
    expect(part.qty_std).toEqual(300);
    expect(part.qty_sisa).toEqual(250);
    expect(part.remark).toEqual('Database test');
    expect(part.updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero values correctly', async () => {
    const input: UpdatePartInput = {
      id: testPartId,
      qty_std: 0,
      qty_sisa: 0
    };

    const result = await updatePartQuantities(input);

    expect(result.qty_std).toEqual(0);
    expect(result.qty_sisa).toEqual(0);
  });

  it('should throw error for non-existent part', async () => {
    const input: UpdatePartInput = {
      id: 99999,
      qty_std: 100
    };

    expect(updatePartQuantities(input)).rejects.toThrow(/not found/i);
  });

  it('should always update timestamp even with no field changes', async () => {
    const originalPart = await db.select()
      .from(partsTable)
      .where(eq(partsTable.id, testPartId))
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdatePartInput = {
      id: testPartId
    };

    const result = await updatePartQuantities(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalPart[0].updated_at.getTime());
  });
});
