import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { isPostgresDatabaseUrl } from "@/lib/database-url";

export { isPostgresDatabaseUrl };

export const SESSION_COOKIE_NAME = "ms_cert_helper_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  displayName: string;
};

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: nodeEnv === "production",
  };
}

export async function getOrCreateCurrentUser(): Promise<CurrentUser> {
  const { prisma } = await import("@/lib/db");
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existingToken) {
    const existingUser = await prisma.user.findUnique({
      where: { sessionTokenHash: hashSessionToken(existingToken) },
      select: { id: true, displayName: true },
    });
    if (existingUser) return existingUser;
  }

  const sessionToken = createSessionToken();
  const user = await prisma.user.create({
    data: {
      displayName: `Demo user ${sessionToken.slice(0, 6)}`,
      sessionTokenHash: hashSessionToken(sessionToken),
    },
    select: { id: true, displayName: true },
  });

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, buildSessionCookieOptions());
  return user;
}
