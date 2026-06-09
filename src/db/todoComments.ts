import type { Database } from "bun:sqlite";
import { invalidKanban, todoNotFound } from "../errors";

export interface TodoCommentInput {
  content: string;
  author?: string;
}

export interface TodoComment {
  id: number;
  todo_id: number;
  author: string;
  content: string;
  created_at: number;
  updated_at: number;
}

const DEFAULT_COMMENT_AUTHOR = "用户";

export function getTodoComments(db: Database, todoId: number): TodoComment[] {
  ensureTodoExists(db, todoId);
  return db.query("SELECT * FROM todo_comments WHERE todo_id = ? ORDER BY created_at ASC, id ASC").all(todoId) as TodoComment[];
}

export function createTodoComment(db: Database, todoId: number, input: TodoCommentInput): TodoComment {
  ensureTodoExists(db, todoId);
  const content = normalizeCommentContent(input.content);
  const author = normalizeCommentAuthor(input.author);
  const result = db.run("INSERT INTO todo_comments (todo_id, author, content) VALUES (?, ?, ?)", [todoId, author, content]);
  return db.query("SELECT * FROM todo_comments WHERE id = ?").get(Number(result.lastInsertRowid)) as TodoComment;
}

export function deleteTodoComment(db: Database, todoId: number, commentId: number): void {
  ensureTodoExists(db, todoId);
  db.run("DELETE FROM todo_comments WHERE id = ? AND todo_id = ?", [commentId, todoId]);
}

function ensureTodoExists(db: Database, todoId: number): void {
  const todo = db.query("SELECT id FROM todo_items WHERE id = ?").get(todoId);
  if (!todo) throw todoNotFound();
}

function normalizeCommentContent(value: unknown): string {
  const content = String(value ?? "").trim();
  if (!content) throw invalidKanban();
  if (content.length > 2000) throw invalidKanban();
  return content;
}

function normalizeCommentAuthor(value: unknown): string {
  const author = String(value ?? DEFAULT_COMMENT_AUTHOR).trim() || DEFAULT_COMMENT_AUTHOR;
  if (author.length > 32) throw invalidKanban();
  return author;
}
