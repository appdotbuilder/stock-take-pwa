
import { db } from '../db';
import { stockTakingRecordsTable, partsTable } from '../db/schema';
import { type CreateStockTakingRecordInput, type StockTakingRecord } from '../schema';
import { eq } from 'drizzle-orm';

export const recordStockCount = async (input: CreateStockTakingRecordInput): Promise<StockTakingRecord> => {
  try {
    // Get the current part data to calculate difference
    const parts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.id, input.part_id))
      .execute();

    if (parts.length === 0) {
      throw new Error(`Part with id ${input.part_id} not found`);
    }

    const part = parts[0];
    const qtyDifference = input.qty_counted - part.qty_std;

    // Insert stock taking record
    const result = await db.insert(stockTakingRecordsTable)
      .values({
        session_id: input.session_id,
        part_id: input.part_id,
        qty_counted: input.qty_counted,
        qty_difference: qtyDifference,
        remark: input.remark
      })
      .returning()
      .execute();

    // Update part's qty_sisa field
    await db.update(partsTable)
      .set({ qty_sisa: input.qty_counted })
      .where(eq(partsTable.id, input.part_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Stock count recording failed:', error);
    throw error;
  }
};
