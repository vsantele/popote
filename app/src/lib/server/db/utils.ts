import { getDb } from './index';
import { events } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Share Code Generation Utility
 * 
 * Generates unique 6-8 character alphanumeric codes for event sharing
 * Migrated from PocketBase hooks (main.pb.js)
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;

/**
 * Generate a random alphanumeric code
 */
function generateCode(length: number = CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

/**
 * Check if a share code is unique
 */
async function isCodeUnique(code: string): Promise<boolean> {
  const db = getDb();
  const existing = await db.select().from(events).where(eq(events.shareCode, code)).limit(1);
  return existing.length === 0;
}

/**
 * Generate a unique share code with retry logic
 * 
 * @throws Error if unable to generate unique code after MAX_ATTEMPTS
 */
export async function generateUniqueShareCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    if (await isCodeUnique(code)) {
      return code;
    }
  }
  
  throw new Error('Failed to generate unique share code after maximum attempts');
}

/**
 * Validate share code format
 */
export function isValidShareCode(code: string): boolean {
  const regex = /^[A-Z0-9]{6,8}$/;
  return regex.test(code);
}
