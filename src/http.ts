import { INTERNAL_REMOTE_IP_HEADER, serverConfig } from "./config";

export type CookieJar = Record<string, any>;

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("INVALID_ID");
  return id;
}

export function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function badRequest(message: string) {
  return jsonError(message, 400);
}

export function tooManyRequests(message: string) {
  return jsonError(message, 429);
}

/**
 * Returns the client identifier for rate-limiting. Trusts loopback proxy
 * headers (x-real-ip / x-forwarded-for) so nginx can forward the real IP.
 */
export function getClientKey(request: Request): string {
  const remoteIp = request.headers.get(INTERNAL_REMOTE_IP_HEADER);
  if (isTrustedProxyAddress(remoteIp)) {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    const forwardedFor = firstForwardedFor(request.headers.get("x-forwarded-for"));
    if (forwardedFor) return forwardedFor;
  }
  return remoteIp || "unknown";
}

export function shouldUseSecureCookie(request: Request): boolean {
  if (serverConfig.cookieSecure === "true") return true;
  if (serverConfig.cookieSecure === "false") return false;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto) return forwardedProto === "https";
  return new URL(request.url).protocol === "https:";
}

function isTrustedProxyAddress(address: string | null): boolean {
  return !!address && (address === "::1" || address === "::ffff:127.0.0.1" || address.startsWith("127."));
}

function firstForwardedFor(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}
