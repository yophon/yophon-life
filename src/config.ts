import { existsSync } from "node:fs";
import "dotenv/config";

export const SESSION_COOKIE = "yophon_life_session";
export const INTERNAL_REMOTE_IP_HEADER = "x-yophon-life-remote-ip";

export const LOGIN_RATE_LIMIT_MAX = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const DEFAULT_SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;

export const SESSION_TTL_SECONDS = readPositiveIntegerEnv("SESSION_TTL_SECONDS", DEFAULT_SESSION_TTL_SECONDS);

export const serverConfig = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  appOrigin: process.env.APP_ORIGIN,
  cookieSecure: process.env.COOKIE_SECURE,
  distDir: existsSync("frontend/dist") ? "frontend/dist" : "public",
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
