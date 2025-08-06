
import { db } from '../db';
import { stockTakingSessionsTable } from '../db/schema';
import { type StockTakingSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getActiveSessions = async (userId: number): Promise<StockTakingSession[]> => {
  try {
    const results = await db.select()
      .from(stockTakingSessionsTable)
      .where(
        and(
          eq(stockTakingSessionsTable.user_id, userId),
          eq(stockTakingSessionsTable.status, 'ACTIVE')
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active sessions:', error);
    throw error;
  }
};
