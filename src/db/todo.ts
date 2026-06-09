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
const PRIORITIES = new Set(["high", "medium", "low"]);
const STATUSES = new Set(["todo", "done"]);
const SORT_GAP = 1000;
const MIN_SORT_GAP = 2;

export function getTodoItems(db: Database): any[] {
  return db.query("SELECT * FROM todo_items ORDER BY sort_order ASC, created_at DESC").all();
}

export function getTodosByBoard(db: Database, boardId: number): any[] {
  normalizeBoardTodoColumns(db, boardId);
  return db.query("SELECT * FROM todo_items WHERE board_id = ? ORDER BY sort_order ASC").all(boardId);
}

export function createTodoItem(db: Database, item: TodoInput): any {
  const title = normalizeTitle(item.title);
  const description = item.description?.trim() || "";
  const priority = normalizePriority(item.priority);
  const status = normalizeStatus(item.status);
  const board_id = item.board_id || 1;
  const { column_id } = item;
  const columnId = resolveColumnId(db, board_id, column_id);
  const maxRow = db.query("SELECT MAX(sort_order) as max_sort FROM todo_items WHERE board_id = ? AND column_id IS ?").get(board_id, columnId) as any;
  const sort_order = (maxRow?.max_sort ?? -SORT_GAP) + SORT_GAP;
  const result = db.run(
    "INSERT INTO todo_items (title, description, priority, status, board_id, column_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, description, priority, status, board_id, columnId, sort_order],
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
    status,
    board_id,
    column_id: columnId,
    sort_order,
  };
}

export function updateTodoItem(db: Database, id: number, updates: Record<string, any>): any {
  const current = db.query("SELECT * FROM todo_items WHERE id = ?").get(id) as any;
  if (!current) return null;
  updates = normalizeTodoUpdates(updates);
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
  if (updates.sort_order !== undefined || updates.column_id !== undefined) {
    normalizeTodoSortOrdersIfNeeded(db, current.board_id, updates.column_id ?? current.column_id);
    if (updates.column_id !== undefined && current.column_id !== updates.column_id) {
      normalizeTodoSortOrdersIfNeeded(db, current.board_id, current.column_id);
    }
  }
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
      const details = todoChangeDetails(current, updated, updates);
      if (movedColumn) details.unshift(`从「${fromColumn || "未分栏"}」移到「${toColumn || "未分栏"}」`);
      if (!movedColumn && contentChanged) details.push(`栏「${columnName(db, updated.column_id) || "未分栏"}」`);
      recordKanbanActivity(db, {
        action: movedColumn || (reordered && !contentChanged) ? "move" : "update",
        entity_type: "todo",
        entity_id: id,
        entity_title: updated.title,
        board_id: updated.board_id,
        details: details.join("；"),
      });
    }
  }
  return updated;
}

function todoChangeDetails(current: any, updated: any, updates: Record<string, any>): string[] {
  const details: string[] = [];
  if (updates.title !== undefined && current.title !== updated.title) {
    details.push(`标题从「${current.title}」改为「${updated.title}」`);
  }
  if (updates.description !== undefined && current.description !== updated.description) {
    details.push("更新描述");
  }
  if (updates.priority !== undefined && current.priority !== updated.priority) {
    details.push(`优先级 ${priorityText(current.priority)} → ${priorityText(updated.priority)}`);
  }
  if (updates.status !== undefined && current.status !== updated.status) {
    details.push(`状态 ${statusText(current.status)} → ${statusText(updated.status)}`);
  }
  return details;
}

function priorityText(priority: string): string {
  if (priority === "high") return "高";
  if (priority === "low") return "低";
  return "中";
}

function statusText(status: string): string {
  return status === "done" ? "完成" : "待办";
}

function normalizeTitle(value: unknown): string {
  const title = String(value ?? "").trim();
  if (!title) throw new Error("INVALID_TODO_TITLE");
  return title;
}

function normalizePriority(value: unknown): string {
  const priority = String(value ?? "medium").trim();
  if (!PRIORITIES.has(priority)) throw new Error("INVALID_TODO_PRIORITY");
  return priority;
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "todo").trim();
  if (!STATUSES.has(status)) throw new Error("INVALID_TODO_STATUS");
  return status;
}

function normalizeSortOrder(value: unknown): number {
  const sortOrder = Number(value);
  if (!Number.isFinite(sortOrder)) throw new Error("INVALID_TODO_SORT_ORDER");
  return Math.round(sortOrder);
}

function normalizeTodoUpdates(updates: Record<string, any>): Record<string, any> {
  const next = { ...updates };
  if (next.title !== undefined) next.title = normalizeTitle(next.title);
  if (next.description !== undefined) next.description = String(next.description ?? "").trim();
  if (next.priority !== undefined) next.priority = normalizePriority(next.priority);
  if (next.status !== undefined) next.status = normalizeStatus(next.status);
  if (next.sort_order !== undefined) next.sort_order = normalizeSortOrder(next.sort_order);
  return next;
}

function normalizeTodoSortOrdersIfNeeded(db: Database, boardId: number, columnId: number | null): void {
  const rows = db
    .query("SELECT id, sort_order FROM todo_items WHERE board_id = ? AND column_id IS ? ORDER BY sort_order ASC, id ASC")
    .all(boardId, columnId) as any[];
  let shouldNormalize = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].sort_order - rows[i - 1].sort_order < MIN_SORT_GAP) {
      shouldNormalize = true;
      break;
    }
  }
  if (!shouldNormalize) return;

  const update = db.prepare("UPDATE todo_items SET sort_order = ?, updated_at = (unixepoch()) WHERE id = ?");
  db.transaction(() => {
    rows.forEach((row, index) => update.run(index * SORT_GAP, row.id));
  })();
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
