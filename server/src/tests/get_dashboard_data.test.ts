
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, partsTable, storageLocationsTable, stockTakingSessionsTable, stockTakingRecordsTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return zero counts for empty database', async () => {
        // Create a user first
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                role: 'STOCK_TAKER'
            })
            .returning()
            .execute();

        const result = await getDashboardData(userResult[0].id);

        expect(result.total_projects).toEqual(0);
        expect(result.active_sessions).toEqual(0);
        expect(result.total_parts).toEqual(0);
        expect(result.recent_records).toEqual(0);
    });

    it('should count active projects and parts correctly', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                role: 'STOCK_TAKER'
            })
            .returning()
            .execute();

        // Create projects (1 active, 1 inactive)
        const activeProject = await db.insert(projectsTable)
            .values({
                name: 'Active Project',
                description: 'Active project',
                is_active: true
            })
            .returning()
            .execute();

        await db.insert(projectsTable)
            .values({
                name: 'Inactive Project',
                description: 'Inactive project',
                is_active: false
            })
            .returning()
            .execute();

        // Create storage location
        const storageLocation = await db.insert(storageLocationsTable)
            .values({
                location_code: 'A001',
                location_name: 'Test Location'
            })
            .returning()
            .execute();

        // Create parts for active project
        await db.insert(partsTable)
            .values({
                no: '001',
                part: 'Part A',
                std_pack: '10.5',
                project_id: activeProject[0].id,
                part_name: 'Part A Name',
                part_number: 'PA001',
                storage_location_id: storageLocation[0].id,
                qty_std: 100,
                qty_sisa: 95
            })
            .execute();

        await db.insert(partsTable)
            .values({
                no: '002',
                part: 'Part B',
                std_pack: '5.0',
                project_id: activeProject[0].id,
                part_name: 'Part B Name',
                part_number: 'PB001',
                storage_location_id: storageLocation[0].id,
                qty_std: 50,
                qty_sisa: 48
            })
            .execute();

        const result = await getDashboardData(userResult[0].id);

        expect(result.total_projects).toEqual(1); // Only active project
        expect(result.total_parts).toEqual(2); // Parts from active project only
        expect(result.active_sessions).toEqual(0);
        expect(result.recent_records).toEqual(0);
    });

    it('should count active sessions for specific user', async () => {
        // Create users
        const user1 = await db.insert(usersTable)
            .values({
                username: 'user1',
                email: 'user1@example.com',
                password_hash: 'hashedpassword',
                role: 'STOCK_TAKER'
            })
            .returning()
            .execute();

        const user2 = await db.insert(usersTable)
            .values({
                username: 'user2',
                email: 'user2@example.com',
                password_hash: 'hashedpassword',
                role: 'ADMIN'
            })
            .returning()
            .execute();

        // Create project
        const project = await db.insert(projectsTable)
            .values({
                name: 'Test Project',
                description: 'Test project',
                is_active: true
            })
            .returning()
            .execute();

        // Create sessions for user1 (1 active, 1 completed)
        await db.insert(stockTakingSessionsTable)
            .values({
                user_id: user1[0].id,
                project_id: project[0].id,
                session_name: 'Active Session',
                status: 'ACTIVE'
            })
            .execute();

        await db.insert(stockTakingSessionsTable)
            .values({
                user_id: user1[0].id,
                project_id: project[0].id,
                session_name: 'Completed Session',
                status: 'COMPLETED'
            })
            .execute();

        // Create active session for user2
        await db.insert(stockTakingSessionsTable)
            .values({
                user_id: user2[0].id,
                project_id: project[0].id,
                session_name: 'Other User Session',
                status: 'ACTIVE'
            })
            .execute();

        const result = await getDashboardData(user1[0].id);

        expect(result.active_sessions).toEqual(1); // Only user1's active session
    });

    it('should count recent records from user sessions', async () => {
        // Create user
        const user = await db.insert(usersTable)
            .values({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                role: 'STOCK_TAKER'
            })
            .returning()
            .execute();

        // Create project
        const project = await db.insert(projectsTable)
            .values({
                name: 'Test Project',
                description: 'Test project',
                is_active: true
            })
            .returning()
            .execute();

        // Create storage location
        const storageLocation = await db.insert(storageLocationsTable)
            .values({
                location_code: 'A001',
                location_name: 'Test Location'
            })
            .returning()
            .execute();

        // Create part
        const part = await db.insert(partsTable)
            .values({
                no: '001',
                part: 'Part A',
                std_pack: '10.0',
                project_id: project[0].id,
                part_name: 'Part A Name',
                part_number: 'PA001',
                storage_location_id: storageLocation[0].id,
                qty_std: 100,
                qty_sisa: 95
            })
            .returning()
            .execute();

        // Create session
        const session = await db.insert(stockTakingSessionsTable)
            .values({
                user_id: user[0].id,
                project_id: project[0].id,
                session_name: 'Test Session',
                status: 'ACTIVE'
            })
            .returning()
            .execute();

        // Create recent record (within 7 days)
        await db.insert(stockTakingRecordsTable)
            .values({
                session_id: session[0].id,
                part_id: part[0].id,
                qty_counted: 90,
                qty_difference: -5
            })
            .execute();

        // Create old record (more than 7 days ago)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10);

        await db.insert(stockTakingRecordsTable)
            .values({
                session_id: session[0].id,
                part_id: part[0].id,
                qty_counted: 88,
                qty_difference: -7,
                recorded_at: oldDate
            })
            .execute();

        const result = await getDashboardData(user[0].id);

        expect(result.recent_records).toEqual(1); // Only the recent record
    });
});
