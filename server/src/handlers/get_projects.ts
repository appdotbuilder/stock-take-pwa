
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Project } from '../schema';

export const getProjects = async (): Promise<Project[]> => {
  try {
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    throw error;
  }
};
