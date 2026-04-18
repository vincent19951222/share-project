import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createCookieValue(userId: string): string {
  return userId;
}

export function parseCookieValue(value: string | undefined | null): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}
