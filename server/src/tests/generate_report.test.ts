
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  projectsTable, 
  storageLocationsTable, 
  partsTable, 
  stockTakingSessionsTable, 
  stockTakingRecordsTable 
} from '../db/schema';
import { type ReportRequest } from '../schema';
import { generateReport } from '../handlers/generate_report';

describe('generateReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let userId: number;
  let projectId: number;
  let storageLocationId: number;
  let partId: number;
  let sessionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'STOCK_TAKER'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A test project'
      })
      .returning()
      .execute();
    projectId = projectResult[0].id;

    // Create test storage location
    const locationResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'LOC001',
        location_name: 'Test Location'
      })
      .returning()
      .execute();
    storageLocationId = locationResult[0].id;

    // Create test part
    const partResult = await db.insert(partsTable)
      .values({
        no: 'P001',
        part: 'Test Part',
        std_pack: '10.50',
        project_id: projectId,
        part_name: 'Test Part Name',
        part_number: 'TP001',
        storage_location_id: storageLocationId,
        qty_std: 100,
        qty_sisa: 90
      })
      .returning()
      .execute();
    partId = partResult[0].id;

    // Create test stock taking session
    const sessionResult = await db.insert(stockTakingSessionsTable)
      .values({
        user_id: userId,
        project_id: projectId,
        session_name: 'Test Session',
        status: 'COMPLETED'
      })
      .returning()
      .execute();
    sessionId = sessionResult[0].id;

    // Create test stock taking record
    await db.insert(stockTakingRecordsTable)
      .values({
        session_id: sessionId,
        part_id: partId,
        qty_counted: 85,
        qty_difference: -5,
        remark: 'Test record'
      })
      .execute();
  });

  it('should generate report with basic request', async () => {
    const input: ReportRequest = {
      format: 'PDF'
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_all_.*\.pdf$/);
    expect(result.filename).toContain('.pdf');
  });

  it('should generate report filtered by project', async () => {
    const input: ReportRequest = {
      project_id: projectId,
      format: 'XLS'
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_Test_Project_.*\.xlsx$/);
    expect(result.filename).toContain('.xlsx');
  });

  it('should generate report filtered by session', async () => {
    const input: ReportRequest = {
      session_id: sessionId,
      format: 'PDF'
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_Test Session_.*\.pdf$/);
    expect(result.filename).toContain('.pdf');
  });

  it('should generate report with date range filter', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: ReportRequest = {
      project_id: projectId,
      format: 'XLS',
      date_from: yesterday,
      date_to: tomorrow
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_Test_Project_.*\.xlsx$/);
  });

  it('should generate report with all filters', async () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: ReportRequest = {
      project_id: projectId,
      session_id: sessionId,
      format: 'PDF',
      date_from: today,
      date_to: tomorrow
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_Test Session_.*\.pdf$/);
    expect(typeof result.file_url).toBe('string');
    expect(typeof result.filename).toBe('string');
  });

  it('should handle empty results gracefully', async () => {
    // Use a non-existent project ID
    const input: ReportRequest = {
      project_id: 99999,
      format: 'PDF'
    };

    const result = await generateReport(input);

    expect(result.file_url).toMatch(/^\/reports\//);
    expect(result.filename).toMatch(/^stock_report_project_.*\.pdf$/);
  });

  it('should generate different filenames based on format', async () => {
    const inputPDF: ReportRequest = {
      session_id: sessionId,
      format: 'PDF'
    };

    const inputXLS: ReportRequest = {
      session_id: sessionId,
      format: 'XLS'
    };

    const resultPDF = await generateReport(inputPDF);
    const resultXLS = await generateReport(inputXLS);

    expect(resultPDF.filename).toContain('.pdf');
    expect(resultXLS.filename).toContain('.xlsx');
    expect(resultPDF.filename).not.toEqual(resultXLS.filename);
  });
});
