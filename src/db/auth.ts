import type { Database } from "bun:sqlite";
import { SESSION_TTL_SECONDS } from "../config";

export function createSession(db: Database): string {
  cleanupExpiredSessions(db);
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  db.run("INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)", [sessionId, now, expiresAt]);
  return sessionId;
}

export function cleanupExpiredSessions(db: Database): void {
  const now = Math.floor(Date.now() / 1000);
  db.run("DELETE FROM sessions WHERE expires_at <= ?", [now]);
}

export function validateSession(db: Database, sessionId: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const session = db.query("SELECT * FROM sessions WHERE id = ? AND expires_at > ?").get(sessionId, now) as any;
  return !!session;
}

export function deleteSession(db: Database, sessionId: string): void {
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export async function verifyPassword(db: Database, password: string): Promise<boolean> {
  const row = db.query("SELECT value FROM config WHERE key = 'password'").get() as { value: string } | null;
  if (!row) return false;
  return await Bun.password.verify(password, row.value);
}
