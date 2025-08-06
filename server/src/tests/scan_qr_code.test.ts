
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storageLocationsTable } from '../db/schema';
import { type QRCodeScanInput, type CreateStorageLocationInput } from '../schema';
import { scanQRCode } from '../handlers/scan_qr_code';

// Test storage location data
const testStorageLocation: CreateStorageLocationInput = {
  location_code: 'WH-A001',
  location_name: 'Warehouse A Section 001',
  qr_code: 'QR123456789'
};

describe('scanQRCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return storage location when QR code exists', async () => {
    // Create test storage location
    const createdResult = await db.insert(storageLocationsTable)
      .values(testStorageLocation)
      .returning()
      .execute();

    const testInput: QRCodeScanInput = {
      qr_code: 'QR123456789'
    };

    const result = await scanQRCode(testInput);

    expect(result).not.toBeNull();
    expect(result!.location_code).toEqual('WH-A001');
    expect(result!.location_name).toEqual('Warehouse A Section 001');
    expect(result!.qr_code).toEqual('QR123456789');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when QR code does not exist', async () => {
    const testInput: QRCodeScanInput = {
      qr_code: 'NONEXISTENT123'
    };

    const result = await scanQRCode(testInput);

    expect(result).toBeNull();
  });

  it('should return correct storage location when multiple locations exist', async () => {
    // Create multiple storage locations
    await db.insert(storageLocationsTable)
      .values([
        {
          location_code: 'WH-A001',
          location_name: 'Warehouse A Section 001',
          qr_code: 'QR111111111'
        },
        {
          location_code: 'WH-B002',
          location_name: 'Warehouse B Section 002',
          qr_code: 'QR222222222'
        },
        {
          location_code: 'WH-C003',
          location_name: 'Warehouse C Section 003',
          qr_code: 'QR333333333'
        }
      ])
      .execute();

    const testInput: QRCodeScanInput = {
      qr_code: 'QR222222222'
    };

    const result = await scanQRCode(testInput);

    expect(result).not.toBeNull();
    expect(result!.location_code).toEqual('WH-B002');
    expect(result!.location_name).toEqual('Warehouse B Section 002');
    expect(result!.qr_code).toEqual('QR222222222');
  });

  it('should handle storage location with null qr_code', async () => {
    // Create storage location without QR code
    await db.insert(storageLocationsTable)
      .values({
        location_code: 'WH-NO-QR',
        location_name: 'Warehouse without QR code',
        qr_code: null
      })
      .execute();

    const testInput: QRCodeScanInput = {
      qr_code: 'QR999999999'
    };

    const result = await scanQRCode(testInput);

    expect(result).toBeNull();
  });
});
