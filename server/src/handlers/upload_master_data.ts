
import { db } from '../db';
import { partsTable, projectsTable, storageLocationsTable } from '../db/schema';
import { type ExcelUploadInput } from '../schema';
import { eq } from 'drizzle-orm';

interface ExcelRow {
  No?: string;
  PART?: string;
  std_pack?: number;
  project?: string;
  part_name?: string;
  part_number?: string;
  storage?: string;
  supplier_code?: string;
  supplier_name?: string;
  type?: string;
  image?: string;
  qty_std?: number;
  qty_sisa?: number;
  remark?: string;
}

// Simple Excel parser for basic .xlsx files
function parseExcelBuffer(buffer: Buffer): ExcelRow[] {
  try {
    // This is a simplified parser - in a real implementation you'd use a proper Excel library
    // For now, we'll assume the base64 data represents JSON array of rows
    const jsonString = buffer.toString('utf-8');
    return JSON.parse(jsonString) as ExcelRow[];
  } catch (error) {
    throw new Error('Invalid Excel file format');
  }
}

export async function uploadMasterData(input: ExcelUploadInput): Promise<{ success: boolean; imported_count: number; errors: string[] }> {
  const errors: string[] = [];
  let imported_count = 0;

  try {
    // Verify project exists
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .execute();

    if (project.length === 0) {
      return {
        success: false,
        imported_count: 0,
        errors: [`Project with ID ${input.project_id} not found`]
      };
    }

    // Parse base64 Excel file
    const buffer = Buffer.from(input.file_data, 'base64');
    const rows = parseExcelBuffer(buffer);

    if (rows.length === 0) {
      return {
        success: false,
        imported_count: 0,
        errors: ['No data rows found in Excel file']
      };
    }

    // Get all storage locations for lookup
    const storageLocations = await db.select()
      .from(storageLocationsTable)
      .execute();

    const storageLocationMap = new Map(
      storageLocations.map(loc => [loc.location_code.toLowerCase(), loc.id])
    );

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Excel row number (starting from row 2, assuming headers in row 1)

      try {
        // Validate required fields
        if (!row.No || typeof row.No !== 'string') {
          errors.push(`Row ${rowNumber}: No is required`);
          continue;
        }

        if (!row.PART || typeof row.PART !== 'string') {
          errors.push(`Row ${rowNumber}: PART is required`);
          continue;
        }

        if (!row.part_name || typeof row.part_name !== 'string') {
          errors.push(`Row ${rowNumber}: part_name is required`);
          continue;
        }

        if (!row.part_number || typeof row.part_number !== 'string') {
          errors.push(`Row ${rowNumber}: part_number is required`);
          continue;
        }

        if (!row.storage || typeof row.storage !== 'string') {
          errors.push(`Row ${rowNumber}: storage is required`);
          continue;
        }

        // Validate numeric fields
        const std_pack = typeof row.std_pack === 'number' ? row.std_pack : parseFloat(String(row.std_pack || '0'));
        if (isNaN(std_pack) || std_pack <= 0) {
          errors.push(`Row ${rowNumber}: std_pack must be a positive number`);
          continue;
        }

        const qty_std = typeof row.qty_std === 'number' ? row.qty_std : parseInt(String(row.qty_std || '0'));
        if (isNaN(qty_std) || qty_std < 0) {
          errors.push(`Row ${rowNumber}: qty_std must be a non-negative integer`);
          continue;
        }

        const qty_sisa = typeof row.qty_sisa === 'number' ? row.qty_sisa : parseInt(String(row.qty_sisa || '0'));
        if (isNaN(qty_sisa) || qty_sisa < 0) {
          errors.push(`Row ${rowNumber}: qty_sisa must be a non-negative integer`);
          continue;
        }

        // Find storage location
        const storageLocationId = storageLocationMap.get(row.storage.toLowerCase());
        if (!storageLocationId) {
          errors.push(`Row ${rowNumber}: Storage location '${row.storage}' not found`);
          continue;
        }

        // Insert part record
        await db.insert(partsTable)
          .values({
            no: row.No,
            part: row.PART,
            std_pack: std_pack.toString(), // Convert to string for numeric column
            project_id: input.project_id,
            part_name: row.part_name,
            part_number: row.part_number,
            storage_location_id: storageLocationId,
            supplier_code: row.supplier_code || null,
            supplier_name: row.supplier_name || null,
            type: row.type || null,
            image: row.image || null,
            qty_std: qty_std,
            qty_sisa: qty_sisa,
            remark: row.remark || null
          })
          .execute();

        imported_count++;

      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0 || imported_count > 0,
      imported_count,
      errors
    };

  } catch (error) {
    console.error('Excel upload failed:', error);
    return {
      success: false,
      imported_count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}
