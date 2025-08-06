
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { getProjects } from '../handlers/get_projects';
import { eq } from 'drizzle-orm';

describe('getProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active projects exist', async () => {
    const result = await getProjects();
    expect(result).toEqual([]);
  });

  it('should return only active projects', async () => {
    // Create active project
    await db.insert(projectsTable)
      .values({
        name: 'Active Project',
        description: 'An active project',
        is_active: true
      })
      .execute();

    // Create inactive project
    await db.insert(projectsTable)
      .values({
        name: 'Inactive Project',
        description: 'An inactive project',
        is_active: false
      })
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Project');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple active projects', async () => {
    // Create multiple active projects
    await db.insert(projectsTable)
      .values([
        {
          name: 'Project One',
          description: 'First project',
          is_active: true
        },
        {
          name: 'Project Two',
          description: 'Second project',
          is_active: true
        },
        {
          name: 'Project Three',
          description: null,
          is_active: true
        }
      ])
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(3);
    
    // Verify all returned projects are active
    result.forEach(project => {
      expect(project.is_active).toBe(true);
      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(project.created_at).toBeInstanceOf(Date);
    });

    // Check specific project names exist
    const projectNames = result.map(p => p.name);
    expect(projectNames).toContain('Project One');
    expect(projectNames).toContain('Project Two');
    expect(projectNames).toContain('Project Three');
  });

  it('should handle null descriptions correctly', async () => {
    await db.insert(projectsTable)
      .values({
        name: 'Project with null description',
        description: null,
        is_active: true
      })
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Project with null description');
    expect(result[0].description).toBeNull();
  });

  it('should verify projects are saved correctly in database', async () => {
    await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test description',
        is_active: true
      })
      .execute();

    const result = await getProjects();
    expect(result).toHaveLength(1);

    // Verify the project exists in database
    const dbProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result[0].id))
      .execute();

    expect(dbProjects).toHaveLength(1);
    expect(dbProjects[0].name).toEqual('Test Project');
    expect(dbProjects[0].is_active).toBe(true);
  });
});
