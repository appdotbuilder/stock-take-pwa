
import { db } from '../db';
import { stockTakingSessionsTable, usersTable, projectsTable } from '../db/schema';
import { type CreateStockTakingSessionInput, type StockTakingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const createStockTakingSession = async (input: CreateStockTakingSessionInput): Promise<StockTakingSession> => {
  try {
    // Verify user exists and is active
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    if (!users[0].is_active) {
      throw new Error(`User with id ${input.user_id} is not active`);
    }

    // Verify project exists and is active
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .execute();

    if (projects.length === 0) {
      throw new Error(`Project with id ${input.project_id} not found`);
    }

    if (!projects[0].is_active) {
      throw new Error(`Project with id ${input.project_id} is not active`);
    }

    // Insert stock taking session record
    const result = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: input.user_id,
        project_id: input.project_id,
        session_name: input.session_name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Stock taking session creation failed:', error);
    throw error;
  }
};
