import type { Database } from "bun:sqlite";
import { recordKanbanActivity } from "./kanban";

export interface TodoInput {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  board_id?: number;
  column_id?: number;
}

const TODO_ALLOWED_FIELDS = ["title", "description", "priority", "status", "column_id", "sort_order"] as const;

export function getTodoItems(db: Database): any[] {
  return db.query("SELECT * FROM todo_items ORDER BY sort_order ASC, created_at DESC").all();
}

export function getTodosByBoard(db: Database, boardId: number): any[] {
  normalizeBoardTodoColumns(db, boardId);
  return db.query("SELECT * FROM todo_items WHERE board_id = ? ORDER BY sort_order ASC").all(boardId);
}

export function createTodoItem(db: Database, item: TodoInput): any {
  const { title, description = "", priority = "medium", board_id = 1, column_id } = item;
  const columnId = resolveColumnId(db, board_id, column_id);
  const maxRow = db.query("SELECT MAX(sort_order) as max_sort FROM todo_items WHERE board_id = ? AND column_id IS ?").get(board_id, columnId) as any;
  const sort_order = (maxRow?.max_sort ?? -1000) + 1000;
  const result = db.run(
    "INSERT INTO todo_items (title, description, priority, status, board_id, column_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, description, priority, "todo", board_id, columnId, sort_order],
  );
  const id = Number(result.lastInsertRowid);
  recordKanbanActivity(db, {
    action: "create",
    entity_type: "todo",
    entity_id: id,
    entity_title: title,
    board_id,
    details: columnId ? columnName(db, columnId) : "",
  });
  return {
    id,
    title,
    description,
    priority,
    board_id,
    column_id: columnId,
    sort_order,
  };
}

export function updateTodoItem(db: Database, id: number, updates: Record<string, any>): any {
  const current = db.query("SELECT * FROM todo_items WHERE id = ?").get(id) as any;
  if (!current) return null;
  if (updates.column_id !== undefined) {
    updates = {
      ...updates,
      column_id: resolveColumnId(db, current.board_id, updates.column_id),
    };
  }
  const keys = Object.keys(updates).filter((k) => TODO_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => updates[k]);
  values.push(id);
  db.run(`UPDATE todo_items SET ${sets}, updated_at = (unixepoch()) WHERE id = ?`, values);
  const updated = db.query("SELECT * FROM todo_items WHERE id = ?").get(id) as any;
  if (current && updated) {
    const movedColumn = updates.column_id !== undefined && current.column_id !== updated.column_id;
    const reordered = updates.sort_order !== undefined && current.sort_order !== updated.sort_order;
    const contentChanged = ["title", "description", "priority", "status"].some(
      (key) => updates[key] !== undefined && current[key] !== updated[key],
    );
    if (movedColumn || reordered || contentChanged) {
      const fromColumn = movedColumn ? columnName(db, current.column_id) : "";
      const toColumn = movedColumn ? columnName(db, updated.column_id) : "";
      recordKanbanActivity(db, {
        action: movedColumn || (reordered && !contentChanged) ? "move" : "update",
        entity_type: "todo",
        entity_id: id,
        entity_title: updated.title,
        board_id: updated.board_id,
        details: movedColumn ? `从「${fromColumn || "未分栏"}」移到「${toColumn || "未分栏"}」` : "",
      });
    }
  }
  return updated;
}

export function deleteTodoItem(db: Database, id: number): void {
  const item = db.query("SELECT * FROM todo_items WHERE id = ?").get(id) as any;
  db.run("DELETE FROM todo_items WHERE id = ?", [id]);
  if (item) {
    recordKanbanActivity(db, {
      action: "delete",
      entity_type: "todo",
      entity_id: id,
      entity_title: item.title,
      board_id: item.board_id,
      details: item.column_id ? columnName(db, item.column_id) : "",
    });
  }
}

function columnName(db: Database, columnId?: number | null): string {
  if (!columnId) return "";
  const column = db.query("SELECT name FROM kanban_columns WHERE id = ?").get(columnId) as any;
  return column?.name || "";
}

function resolveColumnId(db: Database, boardId: number, columnId?: number | null): number | null {
  if (columnId !== undefined && columnId !== null) {
    const column = db.query("SELECT id FROM kanban_columns WHERE id = ? AND board_id = ?").get(columnId, boardId) as any;
    if (column) return column.id;
  }
  return firstColumnId(db, boardId);
}

function firstColumnId(db: Database, boardId: number): number | null {
  const column = db
    .query("SELECT id FROM kanban_columns WHERE board_id = ? ORDER BY row_index ASC, sort_order ASC, id ASC LIMIT 1")
    .get(boardId) as any;
  return column?.id ?? null;
}

function normalizeBoardTodoColumns(db: Database, boardId: number): void {
  const fallbackColumnId = firstColumnId(db, boardId);
  if (!fallbackColumnId) return;
  db.run(
    `UPDATE todo_items
     SET column_id = ?, updated_at = (unixepoch())
     WHERE board_id = ?
       AND (column_id IS NULL OR column_id NOT IN (SELECT id FROM kanban_columns WHERE board_id = ?))`,
    [fallbackColumnId, boardId, boardId],
  );
}
