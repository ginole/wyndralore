import bcrypt from "bcryptjs";

// OWASP Password Storage Cheat Sheet currently recommends a bcrypt work factor of >= 10; 12 is
// the modern default and keeps a comfortable margin as hardware speeds up. bcrypt.compare reads
// the cost from each stored hash, so raising this doesn't invalidate existing 10-round hashes —
// they keep verifying, and any new hash written from here on uses 12.
const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
