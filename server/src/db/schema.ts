
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'STOCK_TAKER']);
export const sessionStatusEnum = pgEnum('session_status', ['ACTIVE', 'COMPLETED', 'CANCELLED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Storage locations table
export const storageLocationsTable = pgTable('storage_locations', {
  id: serial('id').primaryKey(),
  location_code: text('location_code').notNull().unique(),
  location_name: text('location_name').notNull(),
  qr_code: text('qr_code').unique(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Parts table (master data)
export const partsTable = pgTable('parts', {
  id: serial('id').primaryKey(),
  no: text('no').notNull(),
  part: text('part').notNull(),
  std_pack: numeric('std_pack', { precision: 10, scale: 2 }).notNull(),
  project_id: integer('project_id').notNull().references(() => projectsTable.id),
  part_name: text('part_name').notNull(),
  part_number: text('part_number').notNull(),
  storage_location_id: integer('storage_location_id').notNull().references(() => storageLocationsTable.id),
  supplier_code: text('supplier_code'),
  supplier_name: text('supplier_name'),
  type: text('type'),
  image: text('image'),
  qty_std: integer('qty_std').notNull().default(0),
  qty_sisa: integer('qty_sisa').notNull().default(0),
  remark: text('remark'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Stock taking sessions table
export const stockTakingSessionsTable = pgTable('stock_taking_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  project_id: integer('project_id').notNull().references(() => projectsTable.id),
  session_name: text('session_name').notNull(),
  status: sessionStatusEnum('status').default('ACTIVE').notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Stock taking records table
export const stockTakingRecordsTable = pgTable('stock_taking_records', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').notNull().references(() => stockTakingSessionsTable.id),
  part_id: integer('part_id').notNull().references(() => partsTable.id),
  qty_counted: integer('qty_counted').notNull(),
  qty_difference: integer('qty_difference').notNull(),
  remark: text('remark'),
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  stockTakingSessions: many(stockTakingSessionsTable)
}));

export const projectsRelations = relations(projectsTable, ({ many }) => ({
  parts: many(partsTable),
  stockTakingSessions: many(stockTakingSessionsTable)
}));

export const storageLocationsRelations = relations(storageLocationsTable, ({ many }) => ({
  parts: many(partsTable)
}));

export const partsRelations = relations(partsTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [partsTable.project_id],
    references: [projectsTable.id]
  }),
  storageLocation: one(storageLocationsTable, {
    fields: [partsTable.storage_location_id],
    references: [storageLocationsTable.id]
  }),
  stockTakingRecords: many(stockTakingRecordsTable)
}));

export const stockTakingSessionsRelations = relations(stockTakingSessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [stockTakingSessionsTable.user_id],
    references: [usersTable.id]
  }),
  project: one(projectsTable, {
    fields: [stockTakingSessionsTable.project_id],
    references: [projectsTable.id]
  }),
  records: many(stockTakingRecordsTable)
}));

export const stockTakingRecordsRelations = relations(stockTakingRecordsTable, ({ one }) => ({
  session: one(stockTakingSessionsTable, {
    fields: [stockTakingRecordsTable.session_id],
    references: [stockTakingSessionsTable.id]
  }),
  part: one(partsTable, {
    fields: [stockTakingRecordsTable.part_id],
    references: [partsTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  projects: projectsTable,
  storageLocations: storageLocationsTable,
  parts: partsTable,
  stockTakingSessions: stockTakingSessionsTable,
  stockTakingRecords: stockTakingRecordsTable
};
