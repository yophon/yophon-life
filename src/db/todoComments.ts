import type { Database } from "bun:sqlite";

export interface TodoCommentInput {
  content: string;
}

export function getTodoComments(db: Database, todoId: number): any[] {
  ensureTodoExists(db, todoId);
  return db.query("SELECT * FROM todo_comments WHERE todo_id = ? ORDER BY created_at ASC, id ASC").all(todoId);
}

export function createTodoComment(db: Database, todoId: number, input: TodoCommentInput): any {
  ensureTodoExists(db, todoId);
  const content = normalizeCommentContent(input.content);
  const result = db.run("INSERT INTO todo_comments (todo_id, content) VALUES (?, ?)", [todoId, content]);
  return db.query("SELECT * FROM todo_comments WHERE id = ?").get(Number(result.lastInsertRowid));
}

export function deleteTodoComment(db: Database, todoId: number, commentId: number): void {
  ensureTodoExists(db, todoId);
  db.run("DELETE FROM todo_comments WHERE id = ? AND todo_id = ?", [commentId, todoId]);
}

function ensureTodoExists(db: Database, todoId: number): void {
  const todo = db.query("SELECT id FROM todo_items WHERE id = ?").get(todoId);
  if (!todo) throw new Error("TODO_NOT_FOUND");
}

function normalizeCommentContent(value: unknown): string {
  const content = String(value ?? "").trim();
  if (!content) throw new Error("INVALID_TODO_COMMENT");
  if (content.length > 2000) throw new Error("INVALID_TODO_COMMENT");
  return content;
}
