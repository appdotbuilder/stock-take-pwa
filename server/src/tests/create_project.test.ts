
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing'
};

const testInputWithoutDescription: CreateProjectInput = {
  name: 'Project Without Description',
  description: null
};

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project with description', async () => {
    const result = await createProject(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A project for testing');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a project without description', async () => {
    const result = await createProject(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Project Without Description');
    expect(result.description).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    const result = await createProject(testInput);

    // Query using proper drizzle syntax
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Test Project');
    expect(projects[0].description).toEqual('A project for testing');
    expect(projects[0].is_active).toBe(true);
    expect(projects[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple projects with unique ids', async () => {
    const firstProject = await createProject(testInput);
    const secondProject = await createProject({
      name: 'Second Project',
      description: 'Another test project'
    });

    expect(firstProject.id).toBeDefined();
    expect(secondProject.id).toBeDefined();
    expect(firstProject.id).not.toEqual(secondProject.id);

    // Verify both projects exist in database
    const allProjects = await db.select()
      .from(projectsTable)
      .execute();

    expect(allProjects).toHaveLength(2);
  });
});
