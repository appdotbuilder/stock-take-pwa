
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, stockTakingSessionsTable } from '../db/schema';
import { type CreateUserInput, type CreateProjectInput, type CreateStockTakingSessionInput } from '../schema';
import { getActiveSessions } from '../handlers/get_active_sessions';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  username: 'test_user',
  email: 'test@example.com',
  password: 'password123',
  role: 'STOCK_TAKER'
};

const testProject: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing'
};

describe('getActiveSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no active sessions', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getActiveSessions(userId);

    expect(result).toEqual([]);
  });

  it('should return active sessions for user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create project
    const projectResult = await db.insert(projectsTable)
      .values(testProject)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create active session
    const sessionInput: CreateStockTakingSessionInput = {
      user_id: userId,
      project_id: projectId,
      session_name: 'Test Active Session'
    };

    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values(sessionInput)
      .returning()
      .execute();

    const result = await getActiveSessions(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(sessionResult[0].id);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].project_id).toEqual(projectId);
    expect(result[0].session_name).toEqual('Test Active Session');
    expect(result[0].status).toEqual('ACTIVE');
    expect(result[0].started_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should not return completed or cancelled sessions', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const projectResult = await db.insert(projectsTable)
      .values(testProject)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create sessions with different statuses
    await db.insert(stockTakingSessionsTable)
      .values([
        {
          user_id: userId,
          project_id: projectId,
          session_name: 'Active Session',
          status: 'ACTIVE'
        },
        {
          user_id: userId,
          project_id: projectId,
          session_name: 'Completed Session',
          status: 'COMPLETED'
        },
        {
          user_id: userId,
          project_id: projectId,
          session_name: 'Cancelled Session',
          status: 'CANCELLED'
        }
      ])
      .execute();

    const result = await getActiveSessions(userId);

    expect(result).toHaveLength(1);
    expect(result[0].session_name).toEqual('Active Session');
    expect(result[0].status).toEqual('ACTIVE');
  });

  it('should not return active sessions from other users', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'other_user',
        email: 'other@example.com',
        password_hash: 'hashed_password',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create project
    const projectResult = await db.insert(projectsTable)
      .values(testProject)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create active sessions for both users
    await db.insert(stockTakingSessionsTable)
      .values([
        {
          user_id: user1Id,
          project_id: projectId,
          session_name: 'User 1 Session',
          status: 'ACTIVE'
        },
        {
          user_id: user2Id,
          project_id: projectId,
          session_name: 'User 2 Session',
          status: 'ACTIVE'
        }
      ])
      .execute();

    const result = await getActiveSessions(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].session_name).toEqual('User 1 Session');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should return multiple active sessions for same user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create project
    const projectResult = await db.insert(projectsTable)
      .values(testProject)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create multiple active sessions
    await db.insert(stockTakingSessionsTable)
      .values([
        {
          user_id: userId,
          project_id: projectId,
          session_name: 'First Active Session',
          status: 'ACTIVE'
        },
        {
          user_id: userId,
          project_id: projectId,
          session_name: 'Second Active Session',
          status: 'ACTIVE'
        }
      ])
      .execute();

    const result = await getActiveSessions(userId);

    expect(result).toHaveLength(2);
    
    const sessionNames = result.map(session => session.session_name).sort();
    expect(sessionNames).toEqual(['First Active Session', 'Second Active Session']);
    
    result.forEach(session => {
      expect(session.user_id).toEqual(userId);
      expect(session.status).toEqual('ACTIVE');
    });
  });
});
