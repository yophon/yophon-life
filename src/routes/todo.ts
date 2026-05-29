import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import { createTodoItem, deleteTodoItem, getTodoItems, updateTodoItem } from "../db/todo";
import { parseId } from "../http";

export function createTodoRoutes(db: Database) {
  return new Elysia({ name: "routes/todo", prefix: "/api/todo" })
    .get("/", () => getTodoItems(db))
    .post("/", ({ body }) => createTodoItem(db, body as any), {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        status: t.Optional(t.String()),
        board_id: t.Optional(t.Number()),
        column_id: t.Optional(t.Number()),
      }),
    })
    .patch("/:id", ({ params, body }) => updateTodoItem(db, parseId(params.id), body as any), {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        status: t.Optional(t.String()),
        column_id: t.Optional(t.Number()),
        sort_order: t.Optional(t.Number()),
      }),
    })
    .delete("/:id", ({ params }) => {
      deleteTodoItem(db, parseId(params.id));
      return { ok: true };
    });
}
