import type { Database } from "bun:sqlite";
import { getTransactionsByMonthGroupedByDate } from "./finance";
import { getKanbanActivitiesByMonth } from "./kanban";

export interface DiaryEntryInput {
  date: string;
  mood: string;
  mood_label: string;
  content: string;
  tags: string[];
}

const DIARY_ALLOWED_FIELDS = ["date", "mood", "mood_label", "content", "tags", "pinned"] as const;

function deserialize(entry: any) {
  if (!entry) return entry;
  return { ...entry, tags: entry.tags ? JSON.parse(entry.tags) : [] };
}

function attachLinkedRecords(db: Database, entries: any[], year: number, month: number): any[] {
  const activityByDate = getKanbanActivitiesByMonth(db, year, month);
  const transactionsByDate = getTransactionsByMonthGroupedByDate(db, year, month);
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const dates = new Set([
    ...entries.map((entry) => entry.date),
    ...Object.keys(activityByDate),
    ...Object.keys(transactionsByDate),
  ]);

  const result = [...dates].map((date) => {
    const entry = entriesByDate.get(date);
    if (entry) {
      return {
        ...entry,
        has_diary: true,
        kanban_activity: activityByDate[date] || [],
        finance_records: transactionsByDate[date] || [],
      };
    }

    return {
      id: null,
      date,
      mood: "",
      mood_label: "",
      content: "",
      tags: [],
      pinned: 0,
      created_at: null,
      updated_at: null,
      has_diary: false,
      kanban_activity: activityByDate[date] || [],
      finance_records: transactionsByDate[date] || [],
    };
  });

  return result.sort((a, b) => {
    const pinnedDiff = Number(b.pinned || 0) - Number(a.pinned || 0);
    if (pinnedDiff !== 0) return pinnedDiff;
    return b.date.localeCompare(a.date);
  });
}

export function getDiaryEntries(db: Database): any[] {
  return (db.query("SELECT * FROM diary_entries ORDER BY pinned DESC, date DESC").all() as any[]).map(deserialize);
}

export function getDiaryEntriesByMonth(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  const entries = (db.query(
    "SELECT * FROM diary_entries WHERE date LIKE ? ORDER BY pinned DESC, date DESC",
  ).all(`${monthStr}%`) as any[]).map(deserialize);
  return attachLinkedRecords(db, entries, year, month);
}

export function searchDiaryEntries(db: Database, keyword: string): any[] {
  const pattern = `%${keyword}%`;
  return (db.query(
    "SELECT * FROM diary_entries WHERE content LIKE ? OR tags LIKE ? ORDER BY date DESC",
  ).all(pattern, pattern) as any[]).map(deserialize);
}

export function getDiaryMoodStats(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  return db.query(
    "SELECT mood, mood_label, COUNT(*) as count FROM diary_entries WHERE date LIKE ? GROUP BY mood ORDER BY count DESC",
  ).all(`${monthStr}%`);
}

export function getDiaryCalendar(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  return db.query(
    "SELECT date, mood, id FROM diary_entries WHERE date LIKE ? ORDER BY date ASC",
  ).all(`${monthStr}%`);
}

export function createDiaryEntry(db: Database, entry: DiaryEntryInput): any {
  const { date, mood, mood_label, content, tags } = entry;
  const result = db.run(
    "INSERT INTO diary_entries (date, mood, mood_label, content, tags) VALUES (?, ?, ?, ?, ?)",
    [date, mood, mood_label, content, JSON.stringify(tags)],
  );
  return { id: result.lastInsertRowid, ...entry };
}

export function updateDiaryEntry(db: Database, id: number, updates: Record<string, any>): any {
  const keys = Object.keys(updates).filter((k) => DIARY_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (k === "tags" ? JSON.stringify(updates[k]) : updates[k]));
  values.push(id);
  db.run(`UPDATE diary_entries SET ${sets}, updated_at = (unixepoch()) WHERE id = ?`, values);
  return deserialize(db.query("SELECT * FROM diary_entries WHERE id = ?").get(id));
}

export function toggleDiaryPin(db: Database, id: number): any {
  db.run("UPDATE diary_entries SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?", [id]);
  return deserialize(db.query("SELECT * FROM diary_entries WHERE id = ?").get(id));
}

export function deleteDiaryEntry(db: Database, id: number): void {
  db.run("DELETE FROM diary_entries WHERE id = ?", [id]);
}
