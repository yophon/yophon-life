import { Elysia, t } from "elysia";
import type { Database } from "bun:sqlite";
import {
  createBoard,
  createBoardFolder,
  createColumn,
  deleteBoard,
  deleteBoardFolder,
  deleteColumn,
  getBoardFolders,
  getBoards,
  getColumns,
  getKanbanActivities,
  updateBoard,
  updateBoardFolder,
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
    .get("/api/kanban/activity", ({ query }) => getKanbanActivities(db, {
      board_id: numericQuery((query as any).board_id),
      entity_type: stringQuery((query as any).entity_type),
      entity_id: numericQuery((query as any).entity_id),
      column_id: numericQuery((query as any).column_id),
      action: stringQuery((query as any).action),
      q: stringQuery((query as any).q),
      limit: numericQuery((query as any).limit),
    }))
    .get("/api/board-folders", () => getBoardFolders(db))
    .post("/api/board-folders", ({ body }) => createBoardFolder(db, (body as any).name), {
      body: t.Object({ name: t.String() }),
    })
    .patch("/api/board-folders/:id", ({ params, body }) => updateBoardFolder(db, parseId(params.id), body as any), {
      body: t.Object({
        name: t.Optional(t.String()),
        sort_order: t.Optional(t.Number()),
      }),
    })
    .delete("/api/board-folders/:id", ({ params }) => {
      deleteBoardFolder(db, parseId(params.id));
      return { ok: true };
    })

    .get("/api/boards", () => getBoards(db))
    .post("/api/boards", ({ body }) => createBoard(db, (body as any).name, (body as any).folder_id), {
      body: t.Object({
        name: t.String(),
        folder_id: t.Optional(t.Nullable(t.Number())),
      }),
    })
    .patch("/api/boards/:id", ({ params, body }) => updateBoard(db, parseId(params.id), body as any), {
      body: t.Object({
        name: t.Optional(t.String()),
        sort_order: t.Optional(t.Number()),
        folder_id: t.Optional(t.Nullable(t.Number())),
      }),
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
      }),
    })
    .delete("/api/columns/:id", ({ params }) => {
      deleteColumn(db, parseId(params.id));
      return { ok: true };
    });
}

function stringQuery(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function numericQuery(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
