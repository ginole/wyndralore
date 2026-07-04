// Excludes visually confusing characters (0/O, 1/I) per PRD §5.1.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `WL-${code}`;
}

export function extractOrderCode(text: string): string | null {
  const match = text.toUpperCase().match(/WL[-\s]?([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})/);
  return match ? `WL-${match[1]}` : null;
}
