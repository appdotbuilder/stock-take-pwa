
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createHash } from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Helper function to verify password hash
function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(':');
  const testHash = createHash('sha256');
  testHash.update(password + salt);
  return testHash.digest('hex') === storedHash;
}

// Test input
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'STOCK_TAKER'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('STOCK_TAKER');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.includes(':')).toBe(true); // Should have salt:hash format

    // Verify password hash is valid
    const isValidHash = verifyPassword('password123', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].role).toEqual('STOCK_TAKER');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);

    // Verify stored password hash works
    const isValidHash = verifyPassword('password123', users[0].password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create admin user correctly', async () => {
    const adminInput: CreateUserInput = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpass',
      role: 'ADMIN'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.username).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password456',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password456',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should hash different passwords differently', async () => {
    const input1: CreateUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123',
      role: 'STOCK_TAKER'
    };

    const input2: CreateUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      password: 'differentpassword',
      role: 'STOCK_TAKER'
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Different passwords should produce different hashes
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // But both should be valid for their respective passwords
    const valid1 = verifyPassword('password123', user1.password_hash);
    const valid2 = verifyPassword('differentpassword', user2.password_hash);
    expect(valid1).toBe(true);
    expect(valid2).toBe(true);

    // Cross-validation should fail
    const invalid1 = verifyPassword('differentpassword', user1.password_hash);
    const invalid2 = verifyPassword('password123', user2.password_hash);
    expect(invalid1).toBe(false);
    expect(invalid2).toBe(false);
  });

  it('should generate unique salts for same password', async () => {
    const input1: CreateUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      password: 'samepassword',
      role: 'STOCK_TAKER'
    };

    const input2: CreateUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      password: 'samepassword', // Same password
      role: 'STOCK_TAKER'
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Same password should still produce different hashes due to different salts
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // But both should verify correctly
    const valid1 = verifyPassword('samepassword', user1.password_hash);
    const valid2 = verifyPassword('samepassword', user2.password_hash);
    expect(valid1).toBe(true);
    expect(valid2).toBe(true);
  });
});
