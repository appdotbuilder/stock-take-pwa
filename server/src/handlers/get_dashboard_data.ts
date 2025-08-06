
import { db } from '../db';
import { projectsTable, stockTakingSessionsTable, partsTable, stockTakingRecordsTable } from '../db/schema';
import { eq, count, and, desc, gte } from 'drizzle-orm';

export async function getDashboardData(userId: number): Promise<{
    total_projects: number;
    active_sessions: number;
    total_parts: number;
    recent_records: number;
}> {
    try {
        // Get total active projects
        const totalProjectsResult = await db.select({
            count: count()
        })
        .from(projectsTable)
        .where(eq(projectsTable.is_active, true))
        .execute();

        // Get active sessions for the user
        const activeSessionsResult = await db.select({
            count: count()
        })
        .from(stockTakingSessionsTable)
        .where(and(
            eq(stockTakingSessionsTable.user_id, userId),
            eq(stockTakingSessionsTable.status, 'ACTIVE')
        ))
        .execute();

        // Get total parts across all active projects
        const totalPartsResult = await db.select({
            count: count()
        })
        .from(partsTable)
        .innerJoin(projectsTable, eq(partsTable.project_id, projectsTable.id))
        .where(eq(projectsTable.is_active, true))
        .execute();

        // Get recent records (last 7 days) from user's sessions
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentRecordsResult = await db.select({
            count: count()
        })
        .from(stockTakingRecordsTable)
        .innerJoin(stockTakingSessionsTable, eq(stockTakingRecordsTable.session_id, stockTakingSessionsTable.id))
        .where(and(
            eq(stockTakingSessionsTable.user_id, userId),
            gte(stockTakingRecordsTable.recorded_at, sevenDaysAgo)
        ))
        .execute();

        return {
            total_projects: totalProjectsResult[0].count,
            active_sessions: activeSessionsResult[0].count,
            total_parts: totalPartsResult[0].count,
            recent_records: recentRecordsResult[0].count
        };
    } catch (error) {
        console.error('Dashboard data fetch failed:', error);
        throw error;
    }
}
