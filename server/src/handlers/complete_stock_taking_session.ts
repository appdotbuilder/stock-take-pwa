
import { db } from '../db';
import { stockTakingSessionsTable } from '../db/schema';
import { type StockTakingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const completeStockTakingSession = async (sessionId: number): Promise<StockTakingSession> => {
  try {
    // Update session status to COMPLETED and set completed_at timestamp
    const result = await db.update(stockTakingSessionsTable)
      .set({
        status: 'COMPLETED',
        completed_at: new Date()
      })
      .where(eq(stockTakingSessionsTable.id, sessionId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Stock taking session with id ${sessionId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Complete stock taking session failed:', error);
    throw error;
  }
};
