
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createProjectInputSchema,
  createStorageLocationInputSchema,
  excelUploadInputSchema,
  qrCodeScanInputSchema,
  createStockTakingSessionInputSchema,
  createStockTakingRecordInputSchema,
  updatePartInputSchema,
  reportRequestSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createProject } from './handlers/create_project';
import { getProjects } from './handlers/get_projects';
import { createStorageLocation } from './handlers/create_storage_location';
import { getStorageLocations } from './handlers/get_storage_locations';
import { uploadMasterData } from './handlers/upload_master_data';
import { getPartsByProject } from './handlers/get_parts_by_project';
import { scanQRCode } from './handlers/scan_qr_code';
import { createStockTakingSession } from './handlers/create_stock_taking_session';
import { getActiveSessions } from './handlers/get_active_sessions';
import { recordStockCount } from './handlers/record_stock_count';
import { updatePartQuantities } from './handlers/update_part_quantities';
import { completeStockTakingSession } from './handlers/complete_stock_taking_session';
import { generateReport } from './handlers/generate_report';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Projects
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),
    
  getProjects: publicProcedure
    .query(() => getProjects()),

  // Storage locations
  createStorageLocation: publicProcedure
    .input(createStorageLocationInputSchema)
    .mutation(({ input }) => createStorageLocation(input)),
    
  getStorageLocations: publicProcedure
    .query(() => getStorageLocations()),

  // Master data
  uploadMasterData: publicProcedure
    .input(excelUploadInputSchema)
    .mutation(({ input }) => uploadMasterData(input)),
    
  getPartsByProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => getPartsByProject(input.projectId)),

  // QR Code scanning
  scanQRCode: publicProcedure
    .input(qrCodeScanInputSchema)
    .mutation(({ input }) => scanQRCode(input)),

  // Stock taking sessions
  createStockTakingSession: publicProcedure
    .input(createStockTakingSessionInputSchema)
    .mutation(({ input }) => createStockTakingSession(input)),
    
  getActiveSessions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getActiveSessions(input.userId)),
    
  completeStockTakingSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => completeStockTakingSession(input.sessionId)),

  // Stock taking records
  recordStockCount: publicProcedure
    .input(createStockTakingRecordInputSchema)
    .mutation(({ input }) => recordStockCount(input)),

  // Part updates
  updatePartQuantities: publicProcedure
    .input(updatePartInputSchema)
    .mutation(({ input }) => updatePartQuantities(input)),

  // Reports
  generateReport: publicProcedure
    .input(reportRequestSchema)
    .mutation(({ input }) => generateReport(input)),

  // Dashboard
  getDashboardData: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDashboardData(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
