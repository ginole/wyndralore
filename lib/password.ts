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

export const MIN_PASSWORD_LENGTH = 8;

// The passwords real credential-stuffing lists actually lead with, plus the ones this site invites
// by name. Deliberately NOT a composition rule ("must contain a letter and a digit"): NIST SP
// 800-63B advises against those precisely because they herd people into Password1 / Qwerty123 /
// Abc12345 — every one of which satisfies the rule and sits near the top of the same attack
// dictionaries. A blocklist rejects what is actually being guessed; a composition rule mostly
// rejects what is easy to describe. Short list on purpose: these few cover the overwhelming bulk of
// real guesses, and it costs no dependency and no network call.
const COMMON_PASSWORDS = new Set([
  "123456", "12345678", "123456789", "1234567890", "1234567", "12345", "123123", "123321", "112233", "121212",
  "111111", "000000", "222222", "555555", "666666", "888888", "7777777", "11111111", "88888888", "654321", "987654321",
  "password", "password1", "password123", "passw0rd", "p@ssword", "p@ssw0rd", "welcome", "welcome1", "letmein",
  "qwerty", "qwerty123", "qwertyuiop", "qazwsx", "1qaz2wsx", "1q2w3e4r", "asdfgh", "asdfghjk", "zxcvbnm", "zaq12wsx",
  "abc123", "abcd1234", "abcdefgh", "a1234567", "iloveyou", "sunshine", "princess", "monkey", "dragon", "shadow",
  "master", "superman", "batman", "trustno1", "whatever", "freedom", "starwars", "football", "baseball", "soccer",
  "michael", "jennifer", "jordan", "charlie", "harley", "hunter", "ashley", "bailey", "killer", "donald",
  "admin", "admin123", "administrator", "login", "guest", "root", "test1234", "changeme", "secret", "google",
  // Themed guesses this site specifically invites.
  "tarot", "tarot123", "tarotcard", "wyndralore", "wyndralore1", "wyndralore123",
]);

/** All one character, or a plain ascending/descending run — catches the endless variants a fixed
 *  list can never enumerate (aaaaaaaa, abcdefgh, 87654321). */
function isTrivialSequence(pw: string): boolean {
  if (new Set(pw).size === 1) return true;
  let ascending = true;
  let descending = true;
  for (let i = 1; i < pw.length; i++) {
    const step = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
    if (step !== 1) ascending = false;
    if (step !== -1) descending = false;
  }
  return ascending || descending;
}

/**
 * Returns a message explaining why this password is unacceptable, or null if it's fine.
 * Shared by registration and password reset so the two can't drift apart — reset used to enforce
 * only the length, which would have let anyone walk a strong password back down to "12345678".
 */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized) || isTrivialSequence(normalized)) {
    return "That password is one of the most commonly guessed. Please choose something less predictable.";
  }
  // A password built from the address it protects is public knowledge the moment the email is.
  // Strip any +tag: ccgo1688+test1@gmail.com is the same mailbox as ccgo1688@gmail.com, and matching
  // the untrimmed local-part would have let "ccgo1688" through — the whole check silently bypassed
  // by an address the user chose for unrelated reasons.
  const localPart = (email?.split("@")[0] ?? "").split("+")[0].toLowerCase();
  if (localPart.length >= 4 && normalized.includes(localPart)) {
    return "Please choose a password that doesn't contain your email address.";
  }
  return null;
}
