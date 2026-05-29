import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import { createSession, deleteSession, validateSession, verifyPassword } from "../db/auth";
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "../config";
import { getClientKey, shouldUseSecureCookie, tooManyRequests, type CookieJar } from "../http";
import { SlidingWindowRateLimiter } from "../rateLimit";

const loginLimiter = new SlidingWindowRateLimiter(LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS);

export function isAuthed(db: Database, cookie: CookieJar): boolean {
  const sid = cookie[SESSION_COOKIE]?.value;
  if (typeof sid !== "string" || !sid) return false;
  return validateSession(db, sid);
}

/** Returns a callback usable as an Elysia `guard.beforeHandle` for private routes. */
export function authGuard(db: Database) {
  return ({ cookie, set }: { cookie: CookieJar; set: any }) => {
    if (!isAuthed(db, cookie)) {
      set.status = 401;
      return { error: "未授权，请先登录" };
    }
  };
}

export const cleanupAuthLimiter = () => loginLimiter.cleanup();

export function createAuthRoutes(db: Database) {
  return new Elysia({ name: "routes/auth", prefix: "/api/auth" })
    .post("/login", async ({ body, cookie, set, request }) => {
      const clientKey = getClientKey(request);
      if (loginLimiter.hit(`login:${clientKey}`)) {
        return tooManyRequests("登录尝试过于频繁，请稍后再试");
      }

      const { password } = body as { password: string };
      const ok = await verifyPassword(db, password);
      if (!ok) {
        set.status = 401;
        return { error: "密码错误" };
      }
      const sid = createSession(db);
      cookie[SESSION_COOKIE].set({
        value: sid,
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookie(request),
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });
      return { ok: true };
    }, {
      body: t.Object({ password: t.String() }),
    })
    .post("/logout", ({ cookie, request }) => {
      const sid = cookie[SESSION_COOKIE]?.value;
      if (typeof sid === "string" && sid.length > 0) {
        deleteSession(db, sid);
        cookie[SESSION_COOKIE].set({
          value: "",
          httpOnly: true,
          sameSite: "lax",
          secure: shouldUseSecureCookie(request),
          maxAge: 0,
          path: "/",
        });
      }
      return { ok: true };
    })
    .get("/check", ({ cookie }) => ({ authed: isAuthed(db, cookie) }));
}
