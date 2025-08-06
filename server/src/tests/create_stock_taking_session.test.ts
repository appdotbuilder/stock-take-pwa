
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockTakingSessionsTable, usersTable, projectsTable } from '../db/schema';
import { type CreateStockTakingSessionInput } from '../schema';
import { createStockTakingSession } from '../handlers/create_stock_taking_session';
import { eq } from 'drizzle-orm';

const testInput: CreateStockTakingSessionInput = {
  user_id: 1,
  project_id: 1,
  session_name: 'Test Stock Taking Session'
};

describe('createStockTakingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a stock taking session', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'STOCK_TAKER',
      is_active: true
    }).execute();

    // Create prerequisite project
    await db.insert(projectsTable).values({
      name: 'Test Project',
      description: 'A test project',
      is_active: true
    }).execute();

    const result = await createStockTakingSession(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.project_id).toEqual(1);
    expect(result.session_name).toEqual('Test Stock Taking Session');
    expect(result.status).toEqual('ACTIVE');
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save session to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'STOCK_TAKER',
      is_active: true
    }).execute();

    // Create prerequisite project
    await db.insert(projectsTable).values({
      name: 'Test Project',
      description: 'A test project',
      is_active: true
    }).execute();

    const result = await createStockTakingSession(testInput);

    // Query database to verify session was saved
    const sessions = await db.select()
      .from(stockTakingSessionsTable)
      .where(eq(stockTakingSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(1);
    expect(sessions[0].project_id).toEqual(1);
    expect(sessions[0].session_name).toEqual('Test Stock Taking Session');
    expect(sessions[0].status).toEqual('ACTIVE');
    expect(sessions[0].started_at).toBeInstanceOf(Date);
    expect(sessions[0].completed_at).toBeNull();
    expect(sessions[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Create prerequisite project only
    await db.insert(projectsTable).values({
      name: 'Test Project',
      description: 'A test project',
      is_active: true
    }).execute();

    await expect(createStockTakingSession(testInput))
      .rejects.toThrow(/user with id 1 not found/i);
  });

  it('should throw error when user is not active', async () => {
    // Create inactive user
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'STOCK_TAKER',
      is_active: false
    }).execute();

    // Create prerequisite project
    await db.insert(projectsTable).values({
      name: 'Test Project',
      description: 'A test project',
      is_active: true
    }).execute();

    await expect(createStockTakingSession(testInput))
      .rejects.toThrow(/user with id 1 is not active/i);
  });

  it('should throw error when project does not exist', async () => {
    // Create prerequisite user only
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'STOCK_TAKER',
      is_active: true
    }).execute();

    await expect(createStockTakingSession(testInput))
      .rejects.toThrow(/project with id 1 not found/i);
  });

  it('should throw error when project is not active', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'STOCK_TAKER',
      is_active: true
    }).execute();

    // Create inactive project
    await db.insert(projectsTable).values({
      name: 'Test Project',
      description: 'A test project',
      is_active: false
    }).execute();

    await expect(createStockTakingSession(testInput))
      .rejects.toThrow(/project with id 1 is not active/i);
  });
});
