
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, storageLocationsTable, partsTable } from '../db/schema';
import { type CreatePartInput } from '../schema';
import { getPartsByProject } from '../handlers/get_parts_by_project';

describe('getPartsByProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let projectId: number;
  let storageLocationId: number;

  beforeEach(async () => {
    // Create test project
    const projects = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A project for testing'
      })
      .returning()
      .execute();
    projectId = projects[0].id;

    // Create test storage location
    const locations = await db.insert(storageLocationsTable)
      .values({
        location_code: 'A001',
        location_name: 'Storage Area A'
      })
      .returning()
      .execute();
    storageLocationId = locations[0].id;
  });

  it('should return empty array for project with no parts', async () => {
    const result = await getPartsByProject(projectId);
    expect(result).toEqual([]);
  });

  it('should fetch all parts for a specific project', async () => {
    // Create test parts for the project
    const testPart1: CreatePartInput = {
      no: 'P001',
      part: 'Bolt',
      std_pack: 100.5,
      project_id: projectId,
      part_name: 'Steel Bolt',
      part_number: 'SB-001',
      storage_location_id: storageLocationId,
      supplier_code: 'SUP001',
      supplier_name: 'Steel Supplier',
      type: 'Hardware',
      image: null,
      qty_std: 500,
      qty_sisa: 450,
      remark: 'High quality bolts'
    };

    const testPart2: CreatePartInput = {
      no: 'P002',
      part: 'Nut',
      std_pack: 200.75,
      project_id: projectId,
      part_name: 'Steel Nut',
      part_number: 'SN-002',
      storage_location_id: storageLocationId,
      supplier_code: null,
      supplier_name: null,
      type: null,
      image: null,
      qty_std: 300,
      qty_sisa: 280,
      remark: null
    };

    await db.insert(partsTable)
      .values([
        {
          ...testPart1,
          std_pack: testPart1.std_pack.toString()
        },
        {
          ...testPart2,
          std_pack: testPart2.std_pack.toString()
        }
      ])
      .execute();

    const result = await getPartsByProject(projectId);

    expect(result).toHaveLength(2);
    
    // Check first part
    const part1 = result.find(p => p.no === 'P001');
    expect(part1).toBeDefined();
    expect(part1!.part).toEqual('Bolt');
    expect(part1!.std_pack).toEqual(100.5);
    expect(typeof part1!.std_pack).toBe('number');
    expect(part1!.part_name).toEqual('Steel Bolt');
    expect(part1!.qty_std).toEqual(500);
    expect(part1!.qty_sisa).toEqual(450);
    expect(part1!.project_id).toEqual(projectId);
    expect(part1!.storage_location_id).toEqual(storageLocationId);

    // Check second part
    const part2 = result.find(p => p.no === 'P002');
    expect(part2).toBeDefined();
    expect(part2!.part).toEqual('Nut');
    expect(part2!.std_pack).toEqual(200.75);
    expect(typeof part2!.std_pack).toBe('number');
    expect(part2!.supplier_code).toBeNull();
    expect(part2!.remark).toBeNull();
  });

  it('should only return parts for the specified project', async () => {
    // Create another project
    const otherProjects = await db.insert(projectsTable)
      .values({
        name: 'Other Project',
        description: 'Another project'
      })
      .returning()
      .execute();
    const otherProjectId = otherProjects[0].id;

    // Create parts for both projects
    await db.insert(partsTable)
      .values([
        {
          no: 'P001',
          part: 'Bolt',
          std_pack: '100.5',
          project_id: projectId,
          part_name: 'Steel Bolt',
          part_number: 'SB-001',
          storage_location_id: storageLocationId,
          supplier_code: null,
          supplier_name: null,
          type: null,
          image: null,
          qty_std: 500,
          qty_sisa: 450,
          remark: null
        },
        {
          no: 'P002',
          part: 'Nut',
          std_pack: '200.75',
          project_id: otherProjectId,
          part_name: 'Steel Nut',
          part_number: 'SN-002',
          storage_location_id: storageLocationId,
          supplier_code: null,
          supplier_name: null,
          type: null,
          image: null,
          qty_std: 300,
          qty_sisa: 280,
          remark: null
        }
      ])
      .execute();

    const result = await getPartsByProject(projectId);

    expect(result).toHaveLength(1);
    expect(result[0].no).toEqual('P001');
    expect(result[0].project_id).toEqual(projectId);
  });

  it('should handle project with parts having different storage locations', async () => {
    // Create another storage location
    const locations = await db.insert(storageLocationsTable)
      .values({
        location_code: 'B001',
        location_name: 'Storage Area B'
      })
      .returning()
      .execute();
    const storageLocationId2 = locations[0].id;

    // Create parts with different storage locations
    await db.insert(partsTable)
      .values([
        {
          no: 'P001',
          part: 'Bolt',
          std_pack: '100.5',
          project_id: projectId,
          part_name: 'Steel Bolt',
          part_number: 'SB-001',
          storage_location_id: storageLocationId,
          supplier_code: null,
          supplier_name: null,
          type: null,
          image: null,
          qty_std: 500,
          qty_sisa: 450,
          remark: null
        },
        {
          no: 'P002',
          part: 'Nut',
          std_pack: '200.75',
          project_id: projectId,
          part_name: 'Steel Nut',
          part_number: 'SN-002',
          storage_location_id: storageLocationId2,
          supplier_code: null,
          supplier_name: null,
          type: null,
          image: null,
          qty_std: 300,
          qty_sisa: 280,
          remark: null
        }
      ])
      .execute();

    const result = await getPartsByProject(projectId);

    expect(result).toHaveLength(2);
    expect(result.find(p => p.storage_location_id === storageLocationId)).toBeDefined();
    expect(result.find(p => p.storage_location_id === storageLocationId2)).toBeDefined();
  });
});
