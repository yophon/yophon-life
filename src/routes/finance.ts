import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import {
  createFinanceCategory,
  createTransaction,
  deleteBudget,
  deleteFinanceCategory,
  deleteTransaction,
  getBudgets,
  getCategoryStats,
  getFinanceCategories,
  getFinanceSummary,
  getMonthlyTrends,
  getTransactions,
  getTransactionsByMonth,
  getTransactionsByYear,
  getYearSummary,
  updateFinanceCategory,
  updateTransaction,
  upsertBudget,
} from "../db/finance";
import { parseId } from "../http";

/**
 * Order matters: literal `/categories`, `/budgets`, `/summary`, `/trends`,
 * `/category-stats` must be registered BEFORE the parameterized `/:id` so
 * Elysia routes them precisely.
 */
export function createFinanceRoutes(db: Database) {
  return new Elysia({ name: "routes/finance", prefix: "/api/finance" })
    // Listings + summaries
    .get("/", ({ query }) => {
      if (query.year && query.month) {
        return getTransactionsByMonth(db, Number(query.year), Number(query.month));
      }
      if (query.year) {
        return getTransactionsByYear(db, Number(query.year));
      }
      return getTransactions(db);
    })
    .get("/summary", ({ query }) => {
      const now = new Date();
      const year = query.year ? Number(query.year) : now.getFullYear();
      const month = query.month ? Number(query.month) : now.getMonth() + 1;
      if (month === 0) return getYearSummary(db, year);
      return getFinanceSummary(db, year, month);
    })
    .get("/trends", () => getMonthlyTrends(db))
    .get("/category-stats", ({ query }) => {
      const now = new Date();
      const year = query.year ? Number(query.year) : now.getFullYear();
      const month = query.month ? Number(query.month) : now.getMonth() + 1;
      return getCategoryStats(db, year, month);
    })

    // Categories
    .get("/categories", ({ query }) => getFinanceCategories(db, query.type as string | undefined))
    .post("/categories", ({ body }) => {
      const { type, name, icon } = body as any;
      return createFinanceCategory(db, type, name, icon || "📌");
    }, {
      body: t.Object({
        type: t.String(),
        name: t.String(),
        icon: t.Optional(t.String()),
      }),
    })
    .patch("/categories/:id", ({ params, body }) => updateFinanceCategory(db, parseId(params.id), body as any), {
      body: t.Object({
        name: t.Optional(t.String()),
        icon: t.Optional(t.String()),
      }),
    })
    .delete("/categories/:id", ({ params }) => {
      deleteFinanceCategory(db, parseId(params.id));
      return { ok: true };
    })

    // Budgets
    .get("/budgets", ({ query }) => {
      const now = new Date();
      const month = query.month || `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      return getBudgets(db, month as string);
    })
    .post("/budgets", ({ body }) => {
      const { month, category, amount } = body as any;
      return upsertBudget(db, month, category, amount);
    }, {
      body: t.Object({
        month: t.String(),
        category: t.Nullable(t.String()),
        amount: t.Number(),
      }),
    })
    .delete("/budgets/:id", ({ params }) => {
      deleteBudget(db, parseId(params.id));
      return { ok: true };
    })

    // Transactions (parameterized :id last)
    .post("/", ({ body }) => createTransaction(db, body as any), {
      body: t.Object({
        type: t.String(),
        amount: t.Number(),
        category: t.String(),
        date: t.String(),
        note: t.Optional(t.String()),
      }),
    })
    .patch("/:id", ({ params, body }) => updateTransaction(db, parseId(params.id), body as any), {
      body: t.Object({
        type: t.Optional(t.String()),
        amount: t.Optional(t.Number()),
        category: t.Optional(t.String()),
        date: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    })
    .delete("/:id", ({ params }) => {
      deleteTransaction(db, parseId(params.id));
      return { ok: true };
    });
}
