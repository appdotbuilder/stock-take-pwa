
import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

function hashPassword(password: string): string {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Create hash with salt
  const hash = createHash('sha256');
  hash.update(password + salt);
  const hashedPassword = hash.digest('hex');
  
  // Return salt + hash combined
  return salt + ':' + hashedPassword;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if user already exists with same email or username
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, input.email),
          eq(usersTable.username, input.username)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === input.email) {
        throw new Error('User with this email already exists');
      }
      if (existingUser.username === input.username) {
        throw new Error('User with this username already exists');
      }
    }

    // Hash the password
    const password_hash = hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        role: input.role,
        is_active: true // Default from schema
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}
