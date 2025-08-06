
import { db } from '../db';
import { partsTable } from '../db/schema';
import { type UpdatePartInput, type Part } from '../schema';
import { eq } from 'drizzle-orm';

export async function updatePartQuantities(input: UpdatePartInput): Promise<Part> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof partsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.qty_std !== undefined) {
      updateData.qty_std = input.qty_std;
    }

    if (input.qty_sisa !== undefined) {
      updateData.qty_sisa = input.qty_sisa;
    }

    if (input.remark !== undefined) {
      updateData.remark = input.remark;
    }

    // Update part record
    const result = await db.update(partsTable)
      .set(updateData)
      .where(eq(partsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Part with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const part = result[0];
    return {
      ...part,
      std_pack: parseFloat(part.std_pack)
    };
  } catch (error) {
    console.error('Part quantities update failed:', error);
    throw error;
  }
}
