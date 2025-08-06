
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type QRCodeScanInput, type StorageLocation } from '../schema';

export async function scanQRCode(input: QRCodeScanInput): Promise<StorageLocation | null> {
  try {
    const result = await db.select()
      .from(storageLocationsTable)
      .where(eq(storageLocationsTable.qr_code, input.qr_code))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('QR code scan failed:', error);
    throw error;
  }
}
