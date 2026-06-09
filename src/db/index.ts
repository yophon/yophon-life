import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import "dotenv/config";

export { Database };

const DB_PATH = process.env.DB_PATH || "data/life.db";
const DEFAULT_PASSWORD = process.env.YOPHON_DEFAULT_PASSWORD;
const DEFAULT_BCRYPT_COST = 10;

export function initDb(): Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");

  createTables(db);
  runMigrations(db);
  seedPassword(db);
  seedDefaults(db);

  return db;
}

function createTables(db: Database) {
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

  db.run(`CREATE TABLE IF NOT EXISTS kanban_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kanban_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    folder_id INTEGER REFERENCES kanban_folders(id) ON DELETE SET NULL,
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

  db.run(`CREATE TABLE IF NOT EXISTS todo_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todo_items(id) ON DELETE CASCADE,
    author TEXT DEFAULT '用户',
    content TEXT NOT NULL,
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

function runMigrations(db: Database) {
  const tryAlter = (sql: string) => {
    try { db.run(sql); } catch { /* column already exists */ }
  };

  tryAlter("ALTER TABLE todo_items ADD COLUMN board_id INTEGER DEFAULT 1");
  tryAlter("ALTER TABLE todo_items ADD COLUMN column_id INTEGER");
  tryAlter("ALTER TABLE todo_items ADD COLUMN sort_order INTEGER DEFAULT 0");
  tryAlter("ALTER TABLE kanban_boards ADD COLUMN folder_id INTEGER REFERENCES kanban_folders(id) ON DELETE SET NULL");

  tryAlter("ALTER TABLE diary_entries ADD COLUMN updated_at INTEGER");
  tryAlter("ALTER TABLE diary_entries ADD COLUMN pinned INTEGER DEFAULT 0");

  tryAlter("ALTER TABLE kanban_activity ADD COLUMN board_name TEXT DEFAULT ''");
  tryAlter("ALTER TABLE kanban_activity ADD COLUMN details TEXT DEFAULT ''");
  tryAlter("ALTER TABLE kanban_columns ADD COLUMN collapsed INTEGER DEFAULT 0");
  tryAlter("ALTER TABLE kanban_columns ADD COLUMN row_index INTEGER DEFAULT 0");
  tryAlter("ALTER TABLE kanban_columns ADD COLUMN width INTEGER");
  tryAlter("ALTER TABLE kanban_columns ADD COLUMN height INTEGER");
  tryAlter("ALTER TABLE todo_comments ADD COLUMN author TEXT DEFAULT '用户'");

  db.run(`CREATE TABLE IF NOT EXISTS todo_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todo_items(id) ON DELETE CASCADE,
    author TEXT DEFAULT '用户',
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`);

  // Enforce one diary entry per date: de-dup existing rows (keep pinned, else
  // newest id), then add the unique index that ON CONFLICT(date) relies on.
  db.run(`DELETE FROM diary_entries WHERE id NOT IN (
    SELECT id FROM diary_entries d
    WHERE id = (
      SELECT id FROM diary_entries d2 WHERE d2.date = d.date
      ORDER BY pinned DESC, id DESC LIMIT 1
    )
  )`);
  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(date)");
}

function seedPassword(db: Database) {
  const existing = db.query("SELECT value FROM config WHERE key = 'password'").get() as { value: string } | null;
  if (!existing && DEFAULT_PASSWORD) {
    const hashed = Bun.password.hashSync(DEFAULT_PASSWORD, {
      algorithm: "bcrypt",
      cost: DEFAULT_BCRYPT_COST,
    });
    db.run("INSERT INTO config (key, value) VALUES ('password', ?)", [hashed]);
  }
}

function seedDefaults(db: Database) {
  const boardCount = (db.query("SELECT COUNT(*) as count FROM kanban_boards").get() as any).count;
  if (boardCount === 0) {
    db.run("INSERT INTO kanban_boards (name, sort_order) VALUES ('默认看板', 0)");
    const boardId = (db.query("SELECT id FROM kanban_boards ORDER BY id DESC LIMIT 1").get() as any).id;
    db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '待办', 0)", [boardId]);
    db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '进行中', 1000)", [boardId]);
    db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '已完成', 2000)", [boardId]);
  }

  const catCount = (db.query("SELECT COUNT(*) as count FROM finance_categories").get() as any).count;
  if (catCount === 0) {
    const ins = db.prepare("INSERT INTO finance_categories (type, name, icon, sort_order) VALUES (?, ?, ?, ?)");
    const cats: [string, string, string, number][] = [
      ["income", "工资", "💼", 0],
      ["income", "自由职业", "💻", 1000],
      ["income", "投资", "📈", 2000],
      ["income", "副业", "🔧", 3000],
      ["income", "退款", "↩️", 4000],
      ["income", "其他", "📌", 5000],
      ["expense", "餐饮", "🍜", 0],
      ["expense", "房租", "🏠", 1000],
      ["expense", "交通", "🚇", 2000],
      ["expense", "购物", "🛒", 3000],
      ["expense", "娱乐", "🎮", 4000],
      ["expense", "话费", "📱", 5000],
      ["expense", "书籍", "📚", 6000],
      ["expense", "咖啡", "☕", 7000],
      ["expense", "水电", "💡", 8000],
      ["expense", "其他", "📌", 9000],
    ];
    for (const [type, name, icon, sort] of cats) {
      ins.run(type, name, icon, sort);
    }
  }
}

export * from "./auth";
export * from "./diary";
export * from "./todo";
export * from "./todoComments";
export * from "./kanban";
export * from "./finance";
