
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password123',
  role: 'ADMIN' as const,
  is_active: true
};

describe('login', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });
  
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^token_\d+_\d+$/);
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.id).toBeDefined();
    expect(typeof result.user.id).toBe('number');
  });

  it('should return valid token format', async () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    // Verify token contains user ID
    expect(result.token).toContain(`token_${result.user.id}_`);
    expect(result.token.length).toBeGreaterThan(10);
  });

  it('should throw error for invalid email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for invalid password', async () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user', async () => {
    // Create inactive user
    const inactiveUser = {
      username: 'inactiveuser',
      email: 'inactive@example.com',
      password_hash: 'hashed_password123',
      role: 'STOCK_TAKER' as const,
      is_active: false
    };

    await db.insert(usersTable)
      .values(inactiveUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'inactive@example.com',
      password: 'password123'
    };

    expect(login(loginInput)).rejects.toThrow(/account is inactive/i);
  });

  it('should handle stock taker role correctly', async () => {
    // Create stock taker user
    const stockTakerUser = {
      username: 'stocktaker',
      email: 'stocktaker@example.com',
      password_hash: 'hashed_password123',
      role: 'STOCK_TAKER' as const,
      is_active: true
    };

    await db.insert(usersTable)
      .values(stockTakerUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'stocktaker@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result.user.role).toBe('STOCK_TAKER');
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^token_\d+_\d+$/);
  });

  it('should return different tokens for different login attempts', async () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result1 = await login(loginInput);
    
    // Wait a millisecond to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const result2 = await login(loginInput);

    expect(result1.token).not.toBe(result2.token);
    expect(result1.user.id).toBe(result2.user.id);
  });
});
