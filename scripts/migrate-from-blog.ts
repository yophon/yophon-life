import { Database } from "bun:sqlite";
import { existsSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { TOTAL_BUDGET_CATEGORY } from "../src/db/finance";

const sourcePath = resolve(process.argv[2] || "data/yophon-blog-live.db");
const targetPath = resolve(process.argv[3] || "data/life.db");

if (!existsSync(sourcePath)) {
  console.error(`源数据库不存在：${sourcePath}`);
  process.exit(1);
}

mkdirSync(dirname(targetPath), { recursive: true });
if (existsSync(targetPath)) {
  const backupPath = `${targetPath}.before-server-migration-${timestamp()}`;
  copyFileSync(targetPath, backupPath);
  console.log(`已备份目标库：${backupPath}`);
}

const src = new Database(sourcePath, { readonly: true });
const dst = new Database(targetPath);

dst.run("PRAGMA foreign_keys = OFF");
createLifeTables(dst);

const migrate = dst.transaction(() => {
  clearTarget(dst);
  migrateConfig(src, dst);
  migrateDiary(src, dst);
  migrateKanban(src, dst);
  migrateFinance(src, dst);
});

migrate();
dst.run("PRAGMA foreign_keys = ON");

const summary = {
  diary_entries: count(dst, "diary_entries"),
  kanban_boards: count(dst, "kanban_boards"),
  kanban_columns: count(dst, "kanban_columns"),
  todo_items: count(dst, "todo_items"),
  kanban_activity: count(dst, "kanban_activity"),
  transactions: count(dst, "transactions"),
  finance_categories: count(dst, "finance_categories"),
  budgets: count(dst, "budgets"),
  config: count(dst, "config"),
};

src.close();
dst.close();

console.log("迁移完成：");
console.table(summary);

function timestamp() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function count(db: Database, table: string): number {
  return (db.query(`SELECT COUNT(*) as count FROM ${table}`).get() as any).count;
}

function hasTable(db: Database, table: string): boolean {
  return !!db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
}

function createLifeTables(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER,
    expires_at INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    mood TEXT,
    mood_label TEXT,
    content TEXT NOT NULL,
    tags TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER,
    pinned INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kanban_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kanban_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    row_index INTEGER DEFAULT 0,
    collapsed INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    board_id INTEGER DEFAULT 1,
    column_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kanban_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_title TEXT NOT NULL,
    board_id INTEGER,
    board_name TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS finance_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📌',
    sort_order INTEGER DEFAULT 0,
    UNIQUE(type, name)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    UNIQUE(month, category)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
}

function clearTarget(db: Database) {
  for (const table of [
    "sessions",
    "todo_items",
    "kanban_columns",
    "kanban_boards",
    "kanban_activity",
    "diary_entries",
    "transactions",
    "finance_categories",
    "budgets",
    "config",
  ]) {
    db.run(`DELETE FROM ${table}`);
  }
}

function migrateConfig(src: Database, dst: Database) {
  if (!hasTable(src, "config")) return;
  const insert = dst.prepare("INSERT INTO config (key, value) VALUES (?, ?)");
  for (const row of src.query("SELECT key, value FROM config").all() as any[]) {
    insert.run(row.key, row.value);
  }
}

function migrateDiary(src: Database, dst: Database) {
  if (!hasTable(src, "diary_entries")) return;
  const insert = dst.prepare(`INSERT INTO diary_entries
    (id, date, mood, mood_label, content, tags, created_at, updated_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of src.query("SELECT * FROM diary_entries ORDER BY id ASC").all() as any[]) {
    insert.run(
      row.id,
      row.date,
      row.mood || "",
      row.mood_label || "",
      row.content || "",
      row.tags || "[]",
      row.created_at ?? Math.floor(Date.now() / 1000),
      row.updated_at ?? null,
      row.pinned ?? 0,
    );
  }
}

function migrateKanban(src: Database, dst: Database) {
  if (hasTable(src, "kanban_boards")) {
    const insertBoard = dst.prepare("INSERT INTO kanban_boards (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)");
    for (const row of src.query("SELECT * FROM kanban_boards ORDER BY id ASC").all() as any[]) {
      insertBoard.run(row.id, row.name, row.sort_order ?? 0, row.created_at ?? Math.floor(Date.now() / 1000));
    }
  }

  if (hasTable(src, "kanban_columns")) {
    const insertColumn = dst.prepare(`INSERT INTO kanban_columns
      (id, board_id, name, sort_order, row_index, collapsed, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const row of src.query("SELECT * FROM kanban_columns ORDER BY id ASC").all() as any[]) {
      insertColumn.run(
        row.id,
        row.board_id,
        row.name,
        row.sort_order ?? 0,
        row.row_index ?? 0,
        row.collapsed ?? 0,
        row.width ?? null,
        row.height ?? null,
      );
    }
  }

  if (hasTable(src, "todo_items")) {
    const insertTodo = dst.prepare(`INSERT INTO todo_items
      (id, title, description, priority, status, board_id, column_id, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const row of src.query("SELECT * FROM todo_items ORDER BY id ASC").all() as any[]) {
      insertTodo.run(
        row.id,
        row.title,
        row.description || "",
        row.priority || "medium",
        row.status || "todo",
        row.board_id ?? 1,
        row.column_id ?? null,
        row.sort_order ?? 0,
        row.created_at ?? Math.floor(Date.now() / 1000),
        row.updated_at ?? Math.floor(Date.now() / 1000),
      );
    }
  }

  if (hasTable(src, "kanban_activity")) {
    const insertActivity = dst.prepare(`INSERT INTO kanban_activity
      (id, action, entity_type, entity_id, entity_title, board_id, board_name, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const row of src.query("SELECT * FROM kanban_activity ORDER BY id ASC").all() as any[]) {
      insertActivity.run(
        row.id,
        row.action,
        row.entity_type,
        row.entity_id ?? null,
        row.entity_title,
        row.board_id ?? null,
        row.board_name || "",
        row.details || "",
        row.created_at ?? Math.floor(Date.now() / 1000),
      );
    }
  }
}

function migrateFinance(src: Database, dst: Database) {
  if (hasTable(src, "transactions")) {
    const insertTransaction = dst.prepare(`INSERT INTO transactions
      (id, type, amount, category, date, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const row of src.query("SELECT * FROM transactions ORDER BY id ASC").all() as any[]) {
      insertTransaction.run(row.id, row.type, row.amount, row.category, row.date, row.note || "", row.created_at ?? Math.floor(Date.now() / 1000));
    }
  }

  if (hasTable(src, "finance_categories")) {
    const insertCategory = dst.prepare(`INSERT INTO finance_categories
      (id, type, name, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)`);
    for (const row of src.query("SELECT * FROM finance_categories ORDER BY id ASC").all() as any[]) {
      insertCategory.run(row.id, row.type, row.name, row.icon || "📌", row.sort_order ?? 0);
    }
  }

  if (hasTable(src, "budgets")) {
    const insertBudget = dst.prepare(`INSERT INTO budgets
      (id, month, category, amount)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(month, category) DO UPDATE SET amount = excluded.amount`);
    for (const row of src.query("SELECT * FROM budgets ORDER BY id ASC").all() as any[]) {
      insertBudget.run(row.id, row.month, row.category || TOTAL_BUDGET_CATEGORY, row.amount);
    }
  }
}
