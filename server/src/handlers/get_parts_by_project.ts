
import { db } from '../db';
import { partsTable, storageLocationsTable } from '../db/schema';
import { type Part } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPartsByProject(projectId: number): Promise<Part[]> {
  try {
    const results = await db.select()
      .from(partsTable)
      .innerJoin(storageLocationsTable, eq(partsTable.storage_location_id, storageLocationsTable.id))
      .where(eq(partsTable.project_id, projectId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      ...result.parts,
      std_pack: parseFloat(result.parts.std_pack) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch parts by project:', error);
    throw error;
  }
}
