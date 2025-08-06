
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, storageLocationsTable, partsTable, stockTakingSessionsTable, stockTakingRecordsTable } from '../db/schema';
import { type CreateStockTakingRecordInput } from '../schema';
import { recordStockCount } from '../handlers/record_stock_count';
import { eq } from 'drizzle-orm';

describe('recordStockCount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should record stock count and calculate difference correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test description'
      })
      .returning()
      .execute();

    const storageLocationResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'LOC001',
        location_name: 'Test Location'
      })
      .returning()
      .execute();

    const partResult = await db.insert(partsTable)
      .values({
        no: 'P001',
        part: 'Test Part',
        std_pack: '10.5',
        project_id: projectResult[0].id,
        part_name: 'Test Part Name',
        part_number: 'TP001',
        storage_location_id: storageLocationResult[0].id,
        qty_std: 100,
        qty_sisa: 100
      })
      .returning()
      .execute();

    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: userResult[0].id,
        project_id: projectResult[0].id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    const testInput: CreateStockTakingRecordInput = {
      session_id: sessionResult[0].id,
      part_id: partResult[0].id,
      qty_counted: 85,
      remark: 'Stock count completed'
    };

    const result = await recordStockCount(testInput);

    // Verify record fields
    expect(result.session_id).toEqual(sessionResult[0].id);
    expect(result.part_id).toEqual(partResult[0].id);
    expect(result.qty_counted).toEqual(85);
    expect(result.qty_difference).toEqual(-15); // 85 - 100
    expect(result.remark).toEqual('Stock count completed');
    expect(result.id).toBeDefined();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update part qty_sisa field', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test description'
      })
      .returning()
      .execute();

    const storageLocationResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'LOC001',
        location_name: 'Test Location'
      })
      .returning()
      .execute();

    const partResult = await db.insert(partsTable)
      .values({
        no: 'P001',
        part: 'Test Part',
        std_pack: '10.5',
        project_id: projectResult[0].id,
        part_name: 'Test Part Name',
        part_number: 'TP001',
        storage_location_id: storageLocationResult[0].id,
        qty_std: 50,
        qty_sisa: 50
      })
      .returning()
      .execute();

    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: userResult[0].id,
        project_id: projectResult[0].id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    const testInput: CreateStockTakingRecordInput = {
      session_id: sessionResult[0].id,
      part_id: partResult[0].id,
      qty_counted: 75,
      remark: null
    };

    await recordStockCount(testInput);

    // Verify part qty_sisa was updated
    const updatedParts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.id, partResult[0].id))
      .execute();

    expect(updatedParts).toHaveLength(1);
    expect(updatedParts[0].qty_sisa).toEqual(75);
  });

  it('should save record to database correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test description'
      })
      .returning()
      .execute();

    const storageLocationResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'LOC001',
        location_name: 'Test Location'
      })
      .returning()
      .execute();

    const partResult = await db.insert(partsTable)
      .values({
        no: 'P001',
        part: 'Test Part',
        std_pack: '10.5',
        project_id: projectResult[0].id,
        part_name: 'Test Part Name',
        part_number: 'TP001',
        storage_location_id: storageLocationResult[0].id,
        qty_std: 200,
        qty_sisa: 200
      })
      .returning()
      .execute();

    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: userResult[0].id,
        project_id: projectResult[0].id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    const testInput: CreateStockTakingRecordInput = {
      session_id: sessionResult[0].id,
      part_id: partResult[0].id,
      qty_counted: 180,
      remark: 'Counted manually'
    };

    const result = await recordStockCount(testInput);

    // Verify record was saved to database
    const records = await db.select()
      .from(stockTakingRecordsTable)
      .where(eq(stockTakingRecordsTable.id, result.id))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].session_id).toEqual(sessionResult[0].id);
    expect(records[0].part_id).toEqual(partResult[0].id);
    expect(records[0].qty_counted).toEqual(180);
    expect(records[0].qty_difference).toEqual(-20); // 180 - 200
    expect(records[0].remark).toEqual('Counted manually');
    expect(records[0].recorded_at).toBeInstanceOf(Date);
    expect(records[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when part does not exist', async () => {
    // Create minimal prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test description'
      })
      .returning()
      .execute();

    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: userResult[0].id,
        project_id: projectResult[0].id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    const testInput: CreateStockTakingRecordInput = {
      session_id: sessionResult[0].id,
      part_id: 99999, // Non-existent part ID
      qty_counted: 50,
      remark: null
    };

    await expect(recordStockCount(testInput)).rejects.toThrow(/Part with id 99999 not found/i);
  });
});
