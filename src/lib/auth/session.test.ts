import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  createSessionToken,
  hashSessionToken,
  isPostgresDatabaseUrl,
} from "./session";

describe("demo session helpers", () => {
  it("creates high-entropy session tokens that are safe for cookies", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("hashes session tokens before persistence", () => {
    const token = "demo-session-token";
    const hash = hashSessionToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it("builds a secure httpOnly cookie for persistent demo sessions", () => {
    const options = buildSessionCookieOptions("production");

    expect(SESSION_COOKIE_NAME).toBe("ms_cert_helper_session");
    expect(options).toMatchObject({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("accepts hosted Postgres URLs and rejects local SQLite file URLs", () => {
    expect(isPostgresDatabaseUrl("postgresql://user:pass@host/db")).toBe(true);
    expect(isPostgresDatabaseUrl("postgres://user:pass@host/db")).toBe(true);
    expect(isPostgresDatabaseUrl("file:./dev.db")).toBe(false);
  });
});
