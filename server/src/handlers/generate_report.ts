
import { db } from '../db';
import { stockTakingSessionsTable, stockTakingRecordsTable, partsTable, usersTable, projectsTable, storageLocationsTable } from '../db/schema';
import { type ReportRequest } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export async function generateReport(input: ReportRequest): Promise<{ file_url: string; filename: string }> {
  try {
    // Build conditions array first
    const conditions: SQL<unknown>[] = [];

    if (input.project_id !== undefined) {
      conditions.push(eq(stockTakingSessionsTable.project_id, input.project_id));
    }

    if (input.session_id !== undefined) {
      conditions.push(eq(stockTakingSessionsTable.id, input.session_id));
    }

    if (input.date_from) {
      conditions.push(gte(stockTakingSessionsTable.started_at, input.date_from));
    }

    if (input.date_to) {
      conditions.push(lte(stockTakingSessionsTable.started_at, input.date_to));
    }

    // Build and execute query directly based on whether we have conditions
    const baseQuery = db.select({
      session_id: stockTakingSessionsTable.id,
      session_name: stockTakingSessionsTable.session_name,
      session_status: stockTakingSessionsTable.status,
      session_started_at: stockTakingSessionsTable.started_at,
      session_completed_at: stockTakingSessionsTable.completed_at,
      user_username: usersTable.username,
      project_name: projectsTable.name,
      part_no: partsTable.no,
      part_name: partsTable.part_name,
      part_number: partsTable.part_number,
      location_code: storageLocationsTable.location_code,
      location_name: storageLocationsTable.location_name,
      qty_std: partsTable.qty_std,
      qty_sisa: partsTable.qty_sisa,
      qty_counted: stockTakingRecordsTable.qty_counted,
      qty_difference: stockTakingRecordsTable.qty_difference,
      record_remark: stockTakingRecordsTable.remark,
      recorded_at: stockTakingRecordsTable.recorded_at,
      std_pack: partsTable.std_pack
    })
    .from(stockTakingSessionsTable)
    .innerJoin(usersTable, eq(stockTakingSessionsTable.user_id, usersTable.id))
    .innerJoin(projectsTable, eq(stockTakingSessionsTable.project_id, projectsTable.id))
    .innerJoin(stockTakingRecordsTable, eq(stockTakingSessionsTable.id, stockTakingRecordsTable.session_id))
    .innerJoin(partsTable, eq(stockTakingRecordsTable.part_id, partsTable.id))
    .innerJoin(storageLocationsTable, eq(partsTable.storage_location_id, storageLocationsTable.id));

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();

    // Convert numeric fields for processing
    const processedResults = results.map(result => ({
      ...result,
      std_pack: parseFloat(result.std_pack)
    }));

    // Generate filename based on filters and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let filename: string;
    
    // Get names for filename generation - query separately if needed for empty results
    if (input.session_id) {
      let sessionName = processedResults[0]?.session_name;
      
      // If no results but we have session_id, query session name directly
      if (!sessionName && input.session_id) {
        const sessionQuery = await db.select({ session_name: stockTakingSessionsTable.session_name })
          .from(stockTakingSessionsTable)
          .where(eq(stockTakingSessionsTable.id, input.session_id))
          .execute();
        sessionName = sessionQuery[0]?.session_name || 'session';
      }
      
      filename = `stock_report_${sessionName || 'session'}_${timestamp}`;
    } else if (input.project_id) {
      let projectName = processedResults[0]?.project_name;
      
      // If no results but we have project_id, query project name directly
      if (!projectName && input.project_id) {
        const projectQuery = await db.select({ name: projectsTable.name })
          .from(projectsTable)
          .where(eq(projectsTable.id, input.project_id))
          .execute();
        projectName = projectQuery[0]?.name || 'project';
      }
      
      filename = `stock_report_${(projectName || 'project').replace(/\s+/g, '_')}_${timestamp}`;
    } else {
      filename = `stock_report_all_${timestamp}`;
    }

    // Add file extension based on format
    const extension = input.format === 'PDF' ? '.pdf' : '.xlsx';
    filename += extension;

    // In a real implementation, this would:
    // 1. Generate actual PDF/Excel file using libraries like puppeteer, jsPDF, or exceljs
    // 2. Save file to storage (filesystem, S3, etc.)
    // 3. Return actual file URL
    
    // For now, return mock response with generated filename
    const file_url = `/reports/${filename}`;

    return {
      file_url,
      filename
    };

  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
}
