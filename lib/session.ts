import { prisma } from "@/lib/prisma";

export interface CookieReader {
  get(name: string): { value: string } | { value?: string } | string | null | undefined;
}

export interface SessionUser {
  id: string;
  teamId: string;
  role: string;
  username: string;
}

function readCookieValue(cookieReader: CookieReader, name: string): string | null {
  const cookie = cookieReader.get(name);

  if (!cookie) {
    return null;
  }

  if (typeof cookie === "string") {
    return cookie.trim() === "" ? null : cookie;
  }

  const value = "value" in cookie ? cookie.value : undefined;
  if (!value || value.trim() === "") {
    return null;
  }

  return value;
}

export function getUserIdFromCookies(cookieReader: CookieReader): string | null {
  return readCookieValue(cookieReader, "userId");
}

export async function loadCurrentUser(cookieReader: CookieReader): Promise<SessionUser | null> {
  const userId = getUserIdFromCookies(cookieReader);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      teamId: true,
      role: true,
      username: true,
    },
  });

  return user ?? null;
}

export function isAdminUser(user: { role: string } | null | undefined): boolean {
  return user?.role === "ADMIN";
}
