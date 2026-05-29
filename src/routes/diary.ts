import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  getDiaryCalendar,
  getDiaryEntries,
  getDiaryEntriesByMonth,
  getDiaryMoodStats,
  searchDiaryEntries,
  toggleDiaryPin,
  updateDiaryEntry,
} from "../db/diary";
import { parseId } from "../http";

export function createDiaryRoutes(db: Database) {
  return new Elysia({ name: "routes/diary", prefix: "/api/diary" })
    .get("/", ({ query }) => {
      if (query.year && query.month) {
        return getDiaryEntriesByMonth(db, Number(query.year), Number(query.month));
      }
      return getDiaryEntries(db);
    })
    .get("/search", ({ query }) => searchDiaryEntries(db, (query.q as string) || ""))
    .get("/stats", ({ query }) => {
      const now = new Date();
      const year = query.year ? Number(query.year) : now.getFullYear();
      const month = query.month ? Number(query.month) : now.getMonth() + 1;
      return getDiaryMoodStats(db, year, month);
    })
    .get("/calendar", ({ query }) => {
      const now = new Date();
      const year = query.year ? Number(query.year) : now.getFullYear();
      const month = query.month ? Number(query.month) : now.getMonth() + 1;
      return getDiaryCalendar(db, year, month);
    })
    .post("/", ({ body }) => createDiaryEntry(db, body as any), {
      body: t.Object({
        date: t.String(),
        mood: t.String(),
        mood_label: t.String(),
        content: t.String(),
        tags: t.Array(t.String()),
      }),
    })
    .patch("/:id/pin", ({ params }) => toggleDiaryPin(db, parseId(params.id)))
    .patch("/:id", ({ params, body }) => updateDiaryEntry(db, parseId(params.id), body as any), {
      body: t.Object({
        date: t.Optional(t.String()),
        mood: t.Optional(t.String()),
        mood_label: t.Optional(t.String()),
        content: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        pinned: t.Optional(t.Number()),
      }),
    })
    .delete("/:id", ({ params }) => {
      deleteDiaryEntry(db, parseId(params.id));
      return { ok: true };
    });
}
