import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SALT_ROUNDS = 10;
const COOKIE_VERSION = "v1";
const LOCAL_AUTH_SECRET_FILE = ".auth-secret";

let cachedAuthSecret: string | null = null;

function getAuthSecret(): string {
  if (cachedAuthSecret) {
    return cachedAuthSecret;
  }

  const envSecret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

  if (envSecret) {
    cachedAuthSecret = envSecret;
    return cachedAuthSecret;
  }

  const secretPath = path.resolve(process.cwd(), LOCAL_AUTH_SECRET_FILE);

  if (existsSync(secretPath)) {
    cachedAuthSecret = readFileSync(secretPath, "utf8").trim();
    return cachedAuthSecret;
  }

  cachedAuthSecret = randomBytes(32).toString("base64url");
  writeFileSync(secretPath, `${cachedAuthSecret}\n`, { encoding: "utf8", flag: "wx" });
  return cachedAuthSecret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createCookieValue(userId: string): string {
  const encodedUserId = Buffer.from(userId, "utf8").toString("base64url");
  const payload = `${COOKIE_VERSION}.${encodedUserId}`;
  return `${payload}.${signPayload(payload)}`;
}

export function parseCookieValue(value: string | undefined | null): string | null {
  const cookieValue = value?.trim();

  if (!cookieValue) {
    return null;
  }

  const [version, encodedUserId, signature, ...rest] = cookieValue.split(".");

  if (rest.length > 0 || version !== COOKIE_VERSION || !encodedUserId || !signature) {
    return null;
  }

  const payload = `${version}.${encodedUserId}`;
  const expectedSignature = signPayload(payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    return Buffer.from(encodedUserId, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
