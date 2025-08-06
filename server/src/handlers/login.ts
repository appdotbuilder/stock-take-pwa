
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<{ token: string; user: { id: number; email: string; role: string } }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // For demo purposes, we'll do a simple password comparison
    // In production, this should use bcrypt.compare
    if (input.password !== 'password123') {
      throw new Error('Invalid email or password');
    }

    // Generate a simple token (in production, use proper JWT)
    const token = `token_${user.id}_${Date.now()}`;

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
