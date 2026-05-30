import type { Database } from "bun:sqlite";

const COLUMN_ALLOWED_FIELDS = ["name", "sort_order", "row_index", "collapsed", "width"] as const;
const BOARD_ALLOWED_FIELDS = ["name", "sort_order"] as const;
const SORT_GAP = 1000;
const MIN_SORT_GAP = 2;
const MIN_COLUMN_WIDTH = 240;
const MAX_COLUMN_WIDTH = 900;

export type KanbanActivityAction = "create" | "update" | "delete" | "move";
export type KanbanActivityEntity = "board" | "column" | "todo";

export interface KanbanActivityInput {
  action: KanbanActivityAction;
  entity_type: KanbanActivityEntity;
  entity_id?: number | null;
  entity_title: string;
  board_id?: number | null;
  board_name?: string;
  details?: string;
}

function boardName(db: Database, boardId?: number | null): string {
  if (!boardId) return "";
  const board = db.query("SELECT name FROM kanban_boards WHERE id = ?").get(boardId) as any;
  return board?.name || "";
}

export function recordKanbanActivity(db: Database, activity: KanbanActivityInput): void {
  db.run(
    `INSERT INTO kanban_activity
      (action, entity_type, entity_id, entity_title, board_id, board_name, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.action,
      activity.entity_type,
      activity.entity_id ?? null,
      activity.entity_title,
      activity.board_id ?? null,
      activity.board_name ?? boardName(db, activity.board_id),
      activity.details ?? "",
    ],
  );
}

export function getKanbanActivitiesByMonth(db: Database, year: number, month: number): Record<string, any[]> {
  const start = Math.floor(new Date(year, month - 1, 1).getTime() / 1000);
  const end = Math.floor(new Date(year, month, 1).getTime() / 1000);
  const rows = db.query(
    "SELECT * FROM kanban_activity WHERE created_at >= ? AND created_at < ? ORDER BY created_at ASC, id ASC",
  ).all(start, end) as any[];

  return rows.reduce((acc, row) => {
    const day = formatLocalDate(row.created_at);
    if (!acc[day]) acc[day] = [];
    acc[day].push(row);
    return acc;
  }, {} as Record<string, any[]>);
}

function formatLocalDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBoards(db: Database): any[] {
  return db.query("SELECT * FROM kanban_boards ORDER BY sort_order ASC").all();
}

export function createBoard(db: Database, name: string): any {
  name = normalizeName(name, "INVALID_BOARD_NAME");
  const maxRow = db.query("SELECT MAX(sort_order) as ms FROM kanban_boards").get() as any;
  const sort_order = (maxRow?.ms ?? -SORT_GAP) + SORT_GAP;
  const result = db.run("INSERT INTO kanban_boards (name, sort_order) VALUES (?, ?)", [name, sort_order]);
  const boardId = Number(result.lastInsertRowid);
  // Default columns mirror the seeded board.
  db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '待办', 0)", [boardId]);
  db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '进行中', 1000)", [boardId]);
  db.run("INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, '已完成', 2000)", [boardId]);
  recordKanbanActivity(db, {
    action: "create",
    entity_type: "board",
    entity_id: boardId,
    entity_title: name,
    board_id: boardId,
    board_name: name,
  });
  const columns = db.query("SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY sort_order").all(boardId);
  return { id: boardId, name, sort_order, columns };
}

export function updateBoard(db: Database, id: number, updates: { name?: string; sort_order?: number }): any {
  updates = normalizeBoardUpdates(updates);
  const keys = Object.keys(updates).filter((k) => BOARD_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const current = db.query("SELECT * FROM kanban_boards WHERE id = ?").get(id) as any;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (updates as any)[k]);
  values.push(id);
  db.run(`UPDATE kanban_boards SET ${sets} WHERE id = ?`, values);
  if (updates.sort_order !== undefined) normalizeBoardSortOrdersIfNeeded(db);
  const updated = db.query("SELECT * FROM kanban_boards WHERE id = ?").get(id) as any;
  if (current && updated) {
    const renamed = updates.name !== undefined && current.name !== updated.name;
    const reordered = updates.sort_order !== undefined && current.sort_order !== updated.sort_order;
    if (!renamed && !reordered) return updated;
    recordKanbanActivity(db, {
      action: reordered && !renamed ? "move" : "update",
      entity_type: "board",
      entity_id: id,
      entity_title: updated.name,
      board_id: id,
      board_name: updated.name,
      details: renamed ? `从「${current.name}」改为「${updated.name}」` : "",
    });
  }
  return updated;
}

export function deleteBoard(db: Database, id: number): void {
  const board = db.query("SELECT * FROM kanban_boards WHERE id = ?").get(id) as any;
  db.run("DELETE FROM todo_items WHERE board_id = ?", [id]);
  db.run("DELETE FROM kanban_columns WHERE board_id = ?", [id]);
  db.run("DELETE FROM kanban_boards WHERE id = ?", [id]);
  if (board) {
    recordKanbanActivity(db, {
      action: "delete",
      entity_type: "board",
      entity_id: id,
      entity_title: board.name,
      board_id: id,
      board_name: board.name,
    });
  }
}

export function getColumns(db: Database, boardId: number): any[] {
  return db.query("SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY row_index ASC, sort_order ASC").all(boardId);
}

export function createColumn(db: Database, boardId: number, name: string): any {
  name = normalizeName(name, "INVALID_COLUMN_NAME");
  const maxRow = db.query("SELECT MAX(sort_order) as ms FROM kanban_columns WHERE board_id = ?").get(boardId) as any;
  const sort_order = (maxRow?.ms ?? -SORT_GAP) + SORT_GAP;
  const result = db.run(
    "INSERT INTO kanban_columns (board_id, name, sort_order) VALUES (?, ?, ?)",
    [boardId, name, sort_order],
  );
  const id = Number(result.lastInsertRowid);
  recordKanbanActivity(db, {
    action: "create",
    entity_type: "column",
    entity_id: id,
    entity_title: name,
    board_id: boardId,
  });
  return { id, board_id: boardId, name, sort_order, row_index: 0, collapsed: 0, width: null, height: null };
}

export function updateColumn(db: Database, id: number, updates: { name?: string; sort_order?: number; row_index?: number; collapsed?: number; width?: number | null }): any {
  updates = normalizeColumnUpdates(updates);
  const keys = Object.keys(updates).filter((k) => COLUMN_ALLOWED_FIELDS.includes(k as any));
  if (keys.length === 0) return null;
  const current = db.query("SELECT * FROM kanban_columns WHERE id = ?").get(id) as any;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (updates as any)[k]);
  values.push(id);
  db.run(`UPDATE kanban_columns SET ${sets} WHERE id = ?`, values);
  if (updates.sort_order !== undefined || updates.row_index !== undefined) {
    const rowIndex = updates.row_index ?? current?.row_index ?? 0;
    normalizeColumnSortOrdersIfNeeded(db, current?.board_id, rowIndex);
    if (updates.row_index !== undefined && current && current.row_index !== updates.row_index) {
      normalizeColumnSortOrdersIfNeeded(db, current.board_id, current.row_index);
    }
  }
  const updated = db.query("SELECT * FROM kanban_columns WHERE id = ?").get(id) as any;
  if (current && updated) {
    const renamed = updates.name !== undefined && current.name !== updated.name;
    const reordered =
      (updates.sort_order !== undefined && current.sort_order !== updated.sort_order) ||
      (updates.row_index !== undefined && current.row_index !== updated.row_index);
    if (renamed || reordered) {
      recordKanbanActivity(db, {
        action: reordered && !renamed ? "move" : "update",
        entity_type: "column",
        entity_id: id,
        entity_title: updated.name,
        board_id: updated.board_id,
        details: renamed ? `从「${current.name}」改为「${updated.name}」` : "",
      });
    }
  }
  return updated;
}

export function deleteColumn(db: Database, id: number): void {
  const column = db.query("SELECT * FROM kanban_columns WHERE id = ?").get(id) as any;
  const targetColumn = column
    ? db.query(
      "SELECT id FROM kanban_columns WHERE board_id = ? AND id != ? ORDER BY row_index ASC, sort_order ASC, id ASC LIMIT 1",
    ).get(column.board_id, id) as any
    : null;
  if (targetColumn) {
    const maxRow = db.query("SELECT MAX(sort_order) as max_sort FROM todo_items WHERE board_id = ? AND column_id = ?").get(column.board_id, targetColumn.id) as any;
    const todos = db.query("SELECT id FROM todo_items WHERE column_id = ? ORDER BY sort_order ASC, id ASC").all(id) as any[];
    const update = db.prepare("UPDATE todo_items SET column_id = ?, sort_order = ?, updated_at = (unixepoch()) WHERE id = ?");
    db.transaction(() => {
      todos.forEach((todo, index) => update.run(targetColumn.id, (maxRow?.max_sort ?? -SORT_GAP) + (index + 1) * SORT_GAP, todo.id));
    })();
  } else {
    db.run("DELETE FROM todo_items WHERE column_id = ?", [id]);
  }
  db.run("DELETE FROM kanban_columns WHERE id = ?", [id]);
  if (column) {
    recordKanbanActivity(db, {
      action: "delete",
      entity_type: "column",
      entity_id: id,
      entity_title: column.name,
      board_id: column.board_id,
    });
  }
}

function normalizeName(value: unknown, errorCode: string): string {
  const name = String(value ?? "").trim();
  if (!name) throw new Error(errorCode);
  return name;
}

function normalizeSortOrder(value: unknown): number {
  const sortOrder = Number(value);
  if (!Number.isFinite(sortOrder)) throw new Error("INVALID_SORT_ORDER");
  return Math.round(sortOrder);
}

function normalizeRowIndex(value: unknown): number {
  const rowIndex = Number(value);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) throw new Error("INVALID_COLUMN_ROW_INDEX");
  return rowIndex;
}

function normalizeCollapsed(value: unknown): number {
  return Number(value) === 1 ? 1 : 0;
}

function clampDimension(value: unknown, min: number, max: number): number | null {
  if (value === null) return null;
  const dimension = Number(value);
  if (!Number.isFinite(dimension)) throw new Error("INVALID_COLUMN_SIZE");
  return Math.max(min, Math.min(max, Math.round(dimension)));
}

function normalizeBoardUpdates(updates: { name?: string; sort_order?: number }) {
  const next: any = { ...updates };
  if (next.name !== undefined) next.name = normalizeName(next.name, "INVALID_BOARD_NAME");
  if (next.sort_order !== undefined) next.sort_order = normalizeSortOrder(next.sort_order);
  return next;
}

function normalizeColumnUpdates(updates: { name?: string; sort_order?: number; row_index?: number; collapsed?: number; width?: number | null }) {
  const next: any = { ...updates };
  if (next.name !== undefined) next.name = normalizeName(next.name, "INVALID_COLUMN_NAME");
  if (next.sort_order !== undefined) next.sort_order = normalizeSortOrder(next.sort_order);
  if (next.row_index !== undefined) next.row_index = normalizeRowIndex(next.row_index);
  if (next.collapsed !== undefined) next.collapsed = normalizeCollapsed(next.collapsed);
  if (next.width !== undefined) next.width = clampDimension(next.width, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH);
  return next;
}

function normalizeBoardSortOrdersIfNeeded(db: Database): void {
  normalizeSortOrdersIfNeeded(db, "kanban_boards", "1 = 1", []);
}

function normalizeColumnSortOrdersIfNeeded(db: Database, boardId: number | undefined, rowIndex: number): void {
  if (!boardId) return;
  normalizeSortOrdersIfNeeded(db, "kanban_columns", "board_id = ? AND row_index = ?", [boardId, rowIndex]);
}

function normalizeSortOrdersIfNeeded(db: Database, table: "kanban_boards" | "kanban_columns", where: string, params: any[]): void {
  const rows = db.query(`SELECT id, sort_order FROM ${table} WHERE ${where} ORDER BY sort_order ASC, id ASC`).all(...params) as any[];
  let shouldNormalize = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].sort_order - rows[i - 1].sort_order < MIN_SORT_GAP) {
      shouldNormalize = true;
      break;
    }
  }
  if (!shouldNormalize) return;

  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  db.transaction(() => {
    rows.forEach((row, index) => update.run(index * SORT_GAP, row.id));
  })();
}
