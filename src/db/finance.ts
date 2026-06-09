import type { Database } from "bun:sqlite";
import { invalidTransaction } from "../errors";

export const TOTAL_BUDGET_CATEGORY = "__total__";

export interface TransactionInput {
  type: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
}

const TRANSACTION_ALLOWED_FIELDS = ["type", "amount", "category", "date", "note"] as const;
const CATEGORY_ALLOWED_FIELDS = ["name", "icon"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function summarize(rows: any[]): FinanceSummary {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === "income") income = row.total;
    if (row.type === "expense") expense = row.total;
  }
  return { income, expense, balance: income - expense };
}

function normalizeTransaction(tx: TransactionInput): TransactionInput {
  const type = tx.type;
  const amount = Number(tx.amount);
  const category = tx.category?.trim();
  const date = tx.date?.trim();

  if (type !== "income" && type !== "expense") throw invalidTransaction();
  if (!Number.isFinite(amount) || amount <= 0) throw invalidTransaction();
  if (!category) throw invalidTransaction();
  if (!DATE_PATTERN.test(date)) throw invalidTransaction();

  return { type, amount, category, date, note: tx.note?.trim() || "" };
}

function normalizeTransactionUpdates(updates: Record<string, any>): Record<string, any> {
  const next = { ...updates };
  if (next.type !== undefined && next.type !== "income" && next.type !== "expense") throw invalidTransaction();
  if (next.amount !== undefined) {
    next.amount = Number(next.amount);
    if (!Number.isFinite(next.amount) || next.amount <= 0) throw invalidTransaction();
  }
  if (next.category !== undefined) {
    next.category = String(next.category).trim();
    if (!next.category) throw invalidTransaction();
  }
  if (next.date !== undefined) {
    next.date = String(next.date).trim();
    if (!DATE_PATTERN.test(next.date)) throw invalidTransaction();
  }
  if (next.note !== undefined) next.note = String(next.note).trim();
  return next;
}

// ── Transactions ───────────────────────────────────────

export function getTransactions(db: Database): any[] {
  return db.query("SELECT * FROM transactions ORDER BY date DESC").all();
}

export function getTransactionsByMonth(db: Database, year: number, month: number): any[] {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  return db.query("SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC").all(`${monthStr}%`);
}

export function getTransactionsByMonthGroupedByDate(db: Database, year: number, month: number): Record<string, any[]> {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  const rows = db.query("SELECT * FROM transactions WHERE date LIKE ? ORDER BY id DESC").all(`${monthStr}%`) as any[];
  return rows.reduce((acc, row) => {
    if (!acc[row.date]) acc[row.date] = [];
    acc[row.date].push(row);
    return acc;
  }, {} as Record<string, any[]>);
}

export function getTransactionsByYear(db: Database, year: number): any[] {
  return db.query("SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC").all(`${year}-%`);
}

export function createTransaction(db: Database, input: TransactionInput): any {
  const tx = normalizeTransaction(input);
  const result = db.run(
    "INSERT INTO transactions (type, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
    [tx.type, tx.amount, tx.category, tx.date, tx.note || ""],
  );
  return { id: result.lastInsertRowid, ...tx };
}

export function updateTransaction(db: Database, id: number, input: Record<string, any>): any {
  const updates = normalizeTransactionUpdates(input);
  const keys = Object.keys(updates).filter((k) => TRANSACTION_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => updates[k]);
  values.push(id);
  db.run(`UPDATE transactions SET ${sets} WHERE id = ?`, values);
  return db.query("SELECT * FROM transactions WHERE id = ?").get(id);
}

export function deleteTransaction(db: Database, id: number): void {
  db.run("DELETE FROM transactions WHERE id = ?", [id]);
}

// ── Summaries ──────────────────────────────────────────

export function getFinanceSummary(db: Database, year: number, month: number): FinanceSummary {
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  const rows = db.query(
    "SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type",
  ).all(`${monthStr}%`) as any[];
  return summarize(rows);
}

export function getYearSummary(db: Database, year: number): FinanceSummary {
  const rows = db.query(
    "SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type",
  ).all(`${year}-%`) as any[];
  return summarize(rows);
}

export function getMonthlyTrends(db: Database): { month: string; income: number; expense: number }[] {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}`;

  const rows = db.query(`
    SELECT substr(date, 1, 7) as month, type, SUM(amount) as total
    FROM transactions
    WHERE date >= ?
    GROUP BY month, type
    ORDER BY month ASC
  `).all(startStr) as any[];

  const monthMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    monthMap[key] = { income: 0, expense: 0 };
  }

  for (const row of rows) {
    if (monthMap[row.month]) {
      if (row.type === "income") monthMap[row.month].income = row.total;
      if (row.type === "expense") monthMap[row.month].expense = row.total;
    }
  }

  return Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));
}

export function getCategoryStats(db: Database, year: number, month: number): any[] {
  const pattern = month > 0
    ? `${year}-${month.toString().padStart(2, "0")}%`
    : `${year}-%`;
  return db.query(
    "SELECT type, category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE date LIKE ? GROUP BY type, category ORDER BY total DESC",
  ).all(pattern);
}

// ── Categories ─────────────────────────────────────────

export function getFinanceCategories(db: Database, type?: string): any[] {
  if (type) {
    return db.query("SELECT * FROM finance_categories WHERE type = ? ORDER BY sort_order ASC").all(type);
  }
  return db.query("SELECT * FROM finance_categories ORDER BY type, sort_order ASC").all();
}

export function createFinanceCategory(db: Database, type: string, name: string, icon: string): any {
  const maxRow = db.query("SELECT MAX(sort_order) as ms FROM finance_categories WHERE type = ?").get(type) as any;
  const sort_order = (maxRow?.ms ?? -1000) + 1000;
  const result = db.run(
    "INSERT INTO finance_categories (type, name, icon, sort_order) VALUES (?, ?, ?, ?)",
    [type, name, icon, sort_order],
  );
  return { id: Number(result.lastInsertRowid), type, name, icon, sort_order };
}

export function updateFinanceCategory(db: Database, id: number, updates: { name?: string; icon?: string }): any {
  const keys = Object.keys(updates).filter((k) => CATEGORY_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (updates as any)[k]);
  values.push(id);
  db.run(`UPDATE finance_categories SET ${sets} WHERE id = ?`, values);
  return db.query("SELECT * FROM finance_categories WHERE id = ?").get(id);
}

export function deleteFinanceCategory(db: Database, id: number): void {
  db.run("DELETE FROM finance_categories WHERE id = ?", [id]);
}

// ── Budgets ────────────────────────────────────────────

export function getBudgets(db: Database, month: string): any[] {
  return db.query("SELECT * FROM budgets WHERE month = ? ORDER BY category ASC").all(month);
}

export function upsertBudget(db: Database, month: string, category: string | null, amount: number): any {
  const normalizedCategory = category || TOTAL_BUDGET_CATEGORY;
  db.run(
    "INSERT INTO budgets (month, category, amount) VALUES (?, ?, ?) ON CONFLICT(month, category) DO UPDATE SET amount = excluded.amount",
    [month, normalizedCategory, amount],
  );
  return db.query("SELECT * FROM budgets WHERE month = ? AND category = ?").get(month, normalizedCategory);
}

export function deleteBudget(db: Database, id: number): void {
  db.run("DELETE FROM budgets WHERE id = ?", [id]);
}
