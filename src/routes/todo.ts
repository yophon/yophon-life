import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import { createTodoComment, deleteTodoComment, getTodoComments } from "../db/todoComments";
import { createTodoItem, deleteTodoItem, getTodoItems, searchTodos, updateTodoItem } from "../db/todo";
import { parseId } from "../http";

export function createTodoRoutes(db: Database) {
  return new Elysia({ name: "routes/todo", prefix: "/api/todo" })
    .get("/", () => getTodoItems(db))
    .get("/search", ({ query }) => searchTodos(db, (query.q as string) || ""))
    .post("/", ({ body }) => createTodoItem(db, body as any), {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        due_date: t.Optional(t.Nullable(t.String())),
        board_id: t.Optional(t.Number()),
        column_id: t.Optional(t.Number()),
      }),
    })
    .patch("/:id", ({ params, body }) => updateTodoItem(db, parseId(params.id), body as any), {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        due_date: t.Optional(t.Nullable(t.String())),
        column_id: t.Optional(t.Number()),
        sort_order: t.Optional(t.Number()),
      }),
    })
    .get("/:id/comments", ({ params }) => getTodoComments(db, parseId(params.id)))
    .post("/:id/comments", ({ params, body }) => createTodoComment(db, parseId(params.id), body as any), {
      body: t.Object({
        content: t.String(),
        author: t.Optional(t.String()),
      }),
    })
    .delete("/:id/comments/:commentId", ({ params }) => {
      deleteTodoComment(db, parseId(params.id), parseId(params.commentId));
      return { ok: true };
    })
    .delete("/:id", ({ params }) => {
      deleteTodoItem(db, parseId(params.id));
      return { ok: true };
    });
}
