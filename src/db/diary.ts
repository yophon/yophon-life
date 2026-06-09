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

export interface DiaryEntryRow {
  id: number;
  date: string;
  mood: string;
  mood_label: string;
  content: string;
  tags: string[];
  pinned: number;
  created_at: number | null;
  updated_at: number | null;
}

export interface DiaryDayView extends DiaryEntryRow {
  has_diary: boolean;
  kanban_activity: any[];
  finance_records: any[];
}

const DIARY_ALLOWED_FIELDS = ["date", "mood", "mood_label", "content", "tags", "pinned"] as const;

function deserialize(row: unknown): DiaryEntryRow | null {
  if (!row) return null;
  const r = row as Record<string, any>;
  return { ...r, tags: r.tags ? JSON.parse(r.tags) : [] } as DiaryEntryRow;
}

function deserializeAll(rows: any[]): DiaryEntryRow[] {
  return rows.map((row) => deserialize(row)!);
}

function attachLinkedRecords(db: Database, entries: DiaryEntryRow[], year: number, month: number): DiaryDayView[] {
  const activityByDate = getKanbanActivitiesByMonth(db, year, month);
  const transactionsByDate = getTransactionsByMonthGroupedByDate(db, year, month);
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const dates = new Set([
    ...entries.map((entry) => entry.date),
    ...Object.keys(activityByDate),
    ...Object.keys(transactionsByDate),
  ]);

  const result: DiaryDayView[] = [...dates].map((date) => {
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
      id: 0,
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

export function getDiaryEntries(db: Database): DiaryEntryRow[] {
  return deserializeAll(db.query("SELECT * FROM diary_entries ORDER BY pinned DESC, date DESC").all() as any[]);
}

export function getDiaryEntriesByMonth(db: Database, year: number, month: number): DiaryDayView[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  const entries = deserializeAll(db.query(
    "SELECT * FROM diary_entries WHERE date LIKE ? ORDER BY pinned DESC, date DESC",
  ).all(`${monthStr}%`) as any[]);
  return attachLinkedRecords(db, entries, year, month);
}

export function searchDiaryEntries(db: Database, keyword: string): DiaryEntryRow[] {
  const pattern = `%${keyword}%`;
  return deserializeAll(db.query(
    "SELECT * FROM diary_entries WHERE content LIKE ? OR tags LIKE ? ORDER BY date DESC",
  ).all(pattern, pattern) as any[]);
}

export function getDiaryMoodStats(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  return db.query(
    "SELECT mood, mood_label, COUNT(*) as count FROM diary_entries WHERE date LIKE ? AND mood != '' GROUP BY mood ORDER BY count DESC",
  ).all(`${monthStr}%`);
}

export function getDiaryCalendar(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  return db.query(
    "SELECT date, mood, id FROM diary_entries WHERE date LIKE ? ORDER BY date ASC",
  ).all(`${monthStr}%`);
}

// One entry per date: if the date already exists, update it instead of inserting
// a duplicate (relies on the unique index on diary_entries.date).
export function createDiaryEntry(db: Database, entry: DiaryEntryInput): DiaryEntryRow {
  const { date, mood, mood_label, content, tags } = entry;
  db.run(
    `INSERT INTO diary_entries (date, mood, mood_label, content, tags) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       mood = excluded.mood,
       mood_label = excluded.mood_label,
       content = excluded.content,
       tags = excluded.tags,
       updated_at = (unixepoch())`,
    [date, mood, mood_label, content, JSON.stringify(tags)],
  );
  return deserialize(db.query("SELECT * FROM diary_entries WHERE date = ?").get(date))!;
}

export function updateDiaryEntry(db: Database, id: number, updates: Record<string, any>): DiaryEntryRow | null {
  const keys = Object.keys(updates).filter((k) => DIARY_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (k === "tags" ? JSON.stringify(updates[k]) : updates[k]));
  values.push(id);
  db.run(`UPDATE diary_entries SET ${sets}, updated_at = (unixepoch()) WHERE id = ?`, values);
  return deserialize(db.query("SELECT * FROM diary_entries WHERE id = ?").get(id));
}

export function toggleDiaryPin(db: Database, id: number): DiaryEntryRow | null {
  db.run("UPDATE diary_entries SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?", [id]);
  return deserialize(db.query("SELECT * FROM diary_entries WHERE id = ?").get(id));
}

export function deleteDiaryEntry(db: Database, id: number): void {
  db.run("DELETE FROM diary_entries WHERE id = ?", [id]);
}
