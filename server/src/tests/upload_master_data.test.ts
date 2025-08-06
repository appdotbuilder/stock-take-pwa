
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, storageLocationsTable, partsTable } from '../db/schema';
import { type ExcelUploadInput } from '../schema';
import { uploadMasterData } from '../handlers/upload_master_data';
import { eq } from 'drizzle-orm';

describe('uploadMasterData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProjectId: number;
  let testStorageLocationId: number;

  beforeEach(async () => {
    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test project for upload'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create test storage location
    const storageResult = await db.insert(storageLocationsTable)
      .values({
        location_code: 'TEST-LOC',
        location_name: 'Test Location',
        qr_code: 'QR123'
      })
      .returning()
      .execute();
    testStorageLocationId = storageResult[0].id;
  });

  // Helper to create test Excel data as JSON (simulating parsed Excel)
  const createExcelData = (data: any[]): string => {
    return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
  };

  const validTestData = [
    {
      No: 'P001',
      PART: 'Test Part 1',
      std_pack: 10.5,
      project: 'Test Project',
      part_name: 'Test Part Name 1',
      part_number: 'TPN001',
      storage: 'TEST-LOC',
      supplier_code: 'SUP001',
      supplier_name: 'Test Supplier',
      type: 'Electronic',
      image: 'test-image.jpg',
      qty_std: 100,
      qty_sisa: 95,
      remark: 'Test remark'
    }
  ];

  it('should successfully upload valid Excel data', async () => {
    const fileData = createExcelData(validTestData);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(true);
    expect(result.imported_count).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify data was inserted
    const parts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.project_id, testProjectId))
      .execute();

    expect(parts).toHaveLength(1);
    const part = parts[0];
    expect(part.no).toBe('P001');
    expect(part.part).toBe('Test Part 1');
    expect(parseFloat(part.std_pack)).toBe(10.5);
    expect(part.part_name).toBe('Test Part Name 1');
    expect(part.part_number).toBe('TPN001');
    expect(part.storage_location_id).toBe(testStorageLocationId);
    expect(part.qty_std).toBe(100);
    expect(part.qty_sisa).toBe(95);
  });

  it('should handle multiple rows correctly', async () => {
    const multiRowData = [
      { ...validTestData[0] },
      {
        No: 'P002',
        PART: 'Test Part 2',
        std_pack: 5.0,
        project: 'Test Project',
        part_name: 'Test Part Name 2',
        part_number: 'TPN002',
        storage: 'TEST-LOC',
        qty_std: 50,
        qty_sisa: 45
      }
    ];

    const fileData = createExcelData(multiRowData);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(true);
    expect(result.imported_count).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Verify both parts were inserted
    const parts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.project_id, testProjectId))
      .execute();

    expect(parts).toHaveLength(2);
  });

  it('should reject invalid project ID', async () => {
    const fileData = createExcelData(validTestData);
    const input: ExcelUploadInput = {
      project_id: 999999, // Non-existent project
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(false);
    expect(result.imported_count).toBe(0);
    expect(result.errors).toContain('Project with ID 999999 not found');
  });

  it('should validate required fields', async () => {
    const invalidData = [
      {
        // Missing No field
        PART: 'Test Part',
        std_pack: 10.5,
        part_name: 'Test Part Name',
        part_number: 'TPN001',
        storage: 'TEST-LOC',
        qty_std: 100,
        qty_sisa: 95
      }
    ];

    const fileData = createExcelData(invalidData);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(false);
    expect(result.imported_count).toBe(0);
    expect(result.errors).toContain('Row 2: No is required');
  });

  it('should validate numeric fields', async () => {
    // Test invalid std_pack (stops validation early due to continue)
    const invalidStdPackData = [
      {
        No: 'P001',
        PART: 'Test Part',
        std_pack: 'invalid', // Invalid numeric value
        part_name: 'Test Part Name',
        part_number: 'TPN001',
        storage: 'TEST-LOC',
        qty_std: 100,
        qty_sisa: 95
      }
    ];

    const fileData1 = createExcelData(invalidStdPackData);
    const input1: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData1
    };

    const result1 = await uploadMasterData(input1);
    expect(result1.success).toBe(false);
    expect(result1.imported_count).toBe(0);
    expect(result1.errors).toContain('Row 2: std_pack must be a positive number');

    // Test invalid qty_std (with valid std_pack)
    const invalidQtyStdData = [
      {
        No: 'P001',
        PART: 'Test Part',
        std_pack: 10.5, // Valid
        part_name: 'Test Part Name',
        part_number: 'TPN001',
        storage: 'TEST-LOC',
        qty_std: -5, // Invalid negative value
        qty_sisa: 95
      }
    ];

    const fileData2 = createExcelData(invalidQtyStdData);
    const input2: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData2
    };

    const result2 = await uploadMasterData(input2);
    expect(result2.success).toBe(false);
    expect(result2.imported_count).toBe(0);
    expect(result2.errors).toContain('Row 2: qty_std must be a non-negative integer');

    // Test invalid qty_sisa (with valid std_pack and qty_std)
    const invalidQtySisaData = [
      {
        No: 'P001',
        PART: 'Test Part',
        std_pack: 10.5, // Valid
        part_name: 'Test Part Name',
        part_number: 'TPN001',
        storage: 'TEST-LOC',
        qty_std: 100, // Valid
        qty_sisa: -10 // Invalid negative value
      }
    ];

    const fileData3 = createExcelData(invalidQtySisaData);
    const input3: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData3
    };

    const result3 = await uploadMasterData(input3);
    expect(result3.success).toBe(false);
    expect(result3.imported_count).toBe(0);
    expect(result3.errors).toContain('Row 2: qty_sisa must be a non-negative integer');
  });

  it('should validate storage location exists', async () => {
    const invalidData = [
      {
        ...validTestData[0],
        storage: 'NON-EXISTENT' // Non-existent storage location
      }
    ];

    const fileData = createExcelData(invalidData);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(false);
    expect(result.imported_count).toBe(0);
    expect(result.errors).toContain("Row 2: Storage location 'NON-EXISTENT' not found");
  });

  it('should handle empty Excel file', async () => {
    const fileData = createExcelData([]);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(false);
    expect(result.imported_count).toBe(0);
    expect(result.errors).toContain('No data rows found in Excel file');
  });

  it('should handle partial success with mixed valid and invalid rows', async () => {
    const mixedData = [
      { ...validTestData[0] }, // Valid row
      {
        // Invalid row - missing required field
        PART: 'Test Part 2',
        std_pack: 5.0,
        part_name: 'Test Part Name 2',
        part_number: 'TPN002',
        storage: 'TEST-LOC',
        qty_std: 50,
        qty_sisa: 45
      },
      {
        // Valid row
        No: 'P003',
        PART: 'Test Part 3',
        std_pack: 7.5,
        project: 'Test Project',
        part_name: 'Test Part Name 3',
        part_number: 'TPN003',
        storage: 'TEST-LOC',
        qty_std: 30,
        qty_sisa: 25
      }
    ];

    const fileData = createExcelData(mixedData);
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: fileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(true); // Success because some rows imported
    expect(result.imported_count).toBe(2); // Only valid rows imported
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Row 3: No is required');

    // Verify only valid rows were inserted
    const parts = await db.select()
      .from(partsTable)
      .where(eq(partsTable.project_id, testProjectId))
      .execute();

    expect(parts).toHaveLength(2);
  });

  it('should handle invalid Excel file format', async () => {
    const invalidFileData = Buffer.from('invalid json data', 'utf-8').toString('base64');
    const input: ExcelUploadInput = {
      project_id: testProjectId,
      file_data: invalidFileData
    };

    const result = await uploadMasterData(input);

    expect(result.success).toBe(false);
    expect(result.imported_count).toBe(0);
    expect(result.errors[0]).toContain('Invalid Excel file format');
  });
});
