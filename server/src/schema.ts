
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['ADMIN', 'STOCK_TAKER']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Project schemas
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// Storage location schemas
export const storageLocationSchema = z.object({
  id: z.number(),
  location_code: z.string(),
  location_name: z.string(),
  qr_code: z.string().nullable(),
  created_at: z.coerce.date()
});

export type StorageLocation = z.infer<typeof storageLocationSchema>;

export const createStorageLocationInputSchema = z.object({
  location_code: z.string().min(1),
  location_name: z.string().min(1),
  qr_code: z.string().nullable()
});

export type CreateStorageLocationInput = z.infer<typeof createStorageLocationInputSchema>;

// Part schemas
export const partSchema = z.object({
  id: z.number(),
  no: z.string(),
  part: z.string(),
  std_pack: z.number(),
  project_id: z.number(),
  part_name: z.string(),
  part_number: z.string(),
  storage_location_id: z.number(),
  supplier_code: z.string().nullable(),
  supplier_name: z.string().nullable(),
  type: z.string().nullable(),
  image: z.string().nullable(),
  qty_std: z.number().int(),
  qty_sisa: z.number().int(),
  remark: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Part = z.infer<typeof partSchema>;

export const createPartInputSchema = z.object({
  no: z.string().min(1),
  part: z.string().min(1),
  std_pack: z.number().positive(),
  project_id: z.number(),
  part_name: z.string().min(1),
  part_number: z.string().min(1),
  storage_location_id: z.number(),
  supplier_code: z.string().nullable(),
  supplier_name: z.string().nullable(),
  type: z.string().nullable(),
  image: z.string().nullable(),
  qty_std: z.number().int().nonnegative(),
  qty_sisa: z.number().int().nonnegative(),
  remark: z.string().nullable()
});

export type CreatePartInput = z.infer<typeof createPartInputSchema>;

export const updatePartInputSchema = z.object({
  id: z.number(),
  qty_std: z.number().int().nonnegative().optional(),
  qty_sisa: z.number().int().nonnegative().optional(),
  remark: z.string().nullable().optional()
});

export type UpdatePartInput = z.infer<typeof updatePartInputSchema>;

// Stock taking session schemas
export const stockTakingSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  project_id: z.number(),
  session_name: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type StockTakingSession = z.infer<typeof stockTakingSessionSchema>;

export const createStockTakingSessionInputSchema = z.object({
  user_id: z.number(),
  project_id: z.number(),
  session_name: z.string().min(1)
});

export type CreateStockTakingSessionInput = z.infer<typeof createStockTakingSessionInputSchema>;

// Stock taking record schemas
export const stockTakingRecordSchema = z.object({
  id: z.number(),
  session_id: z.number(),
  part_id: z.number(),
  qty_counted: z.number().int(),
  qty_difference: z.number().int(),
  remark: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type StockTakingRecord = z.infer<typeof stockTakingRecordSchema>;

export const createStockTakingRecordInputSchema = z.object({
  session_id: z.number(),
  part_id: z.number(),
  qty_counted: z.number().int().nonnegative(),
  remark: z.string().nullable()
});

export type CreateStockTakingRecordInput = z.infer<typeof createStockTakingRecordInputSchema>;

// Excel upload schema for master data
export const excelUploadInputSchema = z.object({
  project_id: z.number(),
  file_data: z.string() // Base64 encoded file data
});

export type ExcelUploadInput = z.infer<typeof excelUploadInputSchema>;

// Report generation schemas
export const reportRequestSchema = z.object({
  project_id: z.number().optional(),
  session_id: z.number().optional(),
  format: z.enum(['PDF', 'XLS']),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

// QR code scan input
export const qrCodeScanInputSchema = z.object({
  qr_code: z.string().min(1)
});

export type QRCodeScanInput = z.infer<typeof qrCodeScanInputSchema>;
