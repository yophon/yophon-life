import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import {
  createBoard,
  createColumn,
  deleteBoard,
  deleteColumn,
  getBoards,
  getColumns,
  updateBoard,
  updateColumn,
} from "../db/kanban";
import { getTodosByBoard } from "../db/todo";
import { parseId } from "../http";

/**
 * Kanban: boards + columns. Note that `/api/boards/*` and `/api/columns/*`
 * are both at the API root, so we don't use a single prefix here.
 */
export function createKanbanRoutes(db: Database) {
  return new Elysia({ name: "routes/kanban" })
    .get("/api/boards", () => getBoards(db))
    .post("/api/boards", ({ body }) => createBoard(db, (body as any).name), {
      body: t.Object({ name: t.String() }),
    })
    .patch("/api/boards/:id", ({ params, body }) => updateBoard(db, parseId(params.id), (body as any).name), {
      body: t.Object({ name: t.String() }),
    })
    .delete("/api/boards/:id", ({ params }) => {
      deleteBoard(db, parseId(params.id));
      return { ok: true };
    })

    .get("/api/boards/:id/columns", ({ params }) => getColumns(db, parseId(params.id)))
    .get("/api/boards/:id/todos", ({ params }) => getTodosByBoard(db, parseId(params.id)))
    .post("/api/boards/:id/columns", ({ params, body }) => createColumn(db, parseId(params.id), (body as any).name), {
      body: t.Object({ name: t.String() }),
    })
    .patch("/api/columns/:id", ({ params, body }) => updateColumn(db, parseId(params.id), body as any), {
      body: t.Object({
        name: t.Optional(t.String()),
        sort_order: t.Optional(t.Number()),
        row_index: t.Optional(t.Number()),
        collapsed: t.Optional(t.Number()),
        width: t.Optional(t.Nullable(t.Number())),
        height: t.Optional(t.Nullable(t.Number())),
      }),
    })
    .delete("/api/columns/:id", ({ params }) => {
      deleteColumn(db, parseId(params.id));
      return { ok: true };
    });
}
