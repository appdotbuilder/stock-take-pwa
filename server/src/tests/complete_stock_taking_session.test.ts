
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, stockTakingSessionsTable } from '../db/schema';
import { type CreateUserInput, type CreateProjectInput, type CreateStockTakingSessionInput } from '../schema';
import { completeStockTakingSession } from '../handlers/complete_stock_taking_session';
import { eq } from 'drizzle-orm';

// Helper to create test user
const createTestUser = async (): Promise<number> => {
  const userInput: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'STOCK_TAKER'
  };

  const result = await db.insert(usersTable)
    .values({
      username: userInput.username,
      email: userInput.email,
      password_hash: 'hashed_password',
      role: userInput.role
    })
    .returning()
    .execute();

  return result[0].id;
};

// Helper to create test project
const createTestProject = async (): Promise<number> => {
  const projectInput: CreateProjectInput = {
    name: 'Test Project',
    description: 'A project for testing'
  };

  const result = await db.insert(projectsTable)
    .values(projectInput)
    .returning()
    .execute();

  return result[0].id;
};

// Helper to create test stock taking session
const createTestSession = async (userId: number, projectId: number): Promise<number> => {
  const sessionInput: CreateStockTakingSessionInput = {
    user_id: userId,
    project_id: projectId,
    session_name: 'Test Session'
  };

  const result = await db.insert(stockTakingSessionsTable)
    .values(sessionInput)
    .returning()
    .execute();

  return result[0].id;
};

describe('completeStockTakingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a stock taking session', async () => {
    // Setup test data
    const userId = await createTestUser();
    const projectId = await createTestProject();
    const sessionId = await createTestSession(userId, projectId);

    const result = await completeStockTakingSession(sessionId);

    // Verify session is completed
    expect(result.id).toEqual(sessionId);
    expect(result.status).toEqual('COMPLETED');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
    expect(result.user_id).toEqual(userId);
    expect(result.project_id).toEqual(projectId);
    expect(result.session_name).toEqual('Test Session');
  });

  it('should save completion to database', async () => {
    // Setup test data
    const userId = await createTestUser();
    const projectId = await createTestProject();
    const sessionId = await createTestSession(userId, projectId);

    const beforeCompletion = new Date();
    const result = await completeStockTakingSession(sessionId);

    // Query database to verify update
    const sessions = await db.select()
      .from(stockTakingSessionsTable)
      .where(eq(stockTakingSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toEqual('COMPLETED');
    expect(sessions[0].completed_at).toBeInstanceOf(Date);
    expect(sessions[0].completed_at).not.toBeNull();
    expect(sessions[0].completed_at! >= beforeCompletion).toBe(true);
  });

  it('should throw error for non-existent session', async () => {
    const nonExistentId = 99999;

    expect(async () => {
      await completeStockTakingSession(nonExistentId);
    }).toThrow(/not found/i);
  });

  it('should complete already active session', async () => {
    // Setup test data
    const userId = await createTestUser();
    const projectId = await createTestProject();
    const sessionId = await createTestSession(userId, projectId);

    // Verify session starts as ACTIVE
    const initialSession = await db.select()
      .from(stockTakingSessionsTable)
      .where(eq(stockTakingSessionsTable.id, sessionId))
      .execute();

    expect(initialSession[0].status).toEqual('ACTIVE');
    expect(initialSession[0].completed_at).toBeNull();

    // Complete the session
    const result = await completeStockTakingSession(sessionId);

    expect(result.status).toEqual('COMPLETED');
    expect(result.completed_at).toBeInstanceOf(Date);
  });
});
