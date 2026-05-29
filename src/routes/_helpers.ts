import { badRequest, type CookieJar } from "../http";

export type AuthedHandlerContext = { cookie: CookieJar };

export function requireNonEmptyString(value: unknown, message: string): string | Response {
  if (typeof value !== "string" || value.trim().length === 0) return badRequest(message);
  return value.trim();
}
