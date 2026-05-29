# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

`yophon-life` 是从 `yophon-blog` 拆出的独立个人生活管理系统，聚焦日记、看板、财务三块私密功能。不要修改同级的 `../yophon-blog`，除非用户明确要求。

## Commands

```bash
bun install
cd frontend && bun install

bun run dev          # backend API server on port 3000
bun run dev:web      # Vite frontend on port 5173, proxies /api to :3000
bun run build        # build frontend into frontend/dist
bun run start        # serve API + static files on port 3000
```

No test suite or linter is configured yet. Frontend has `bun run type-check` inside `frontend/`.

## Architecture

- Root: Bun + Elysia backend.
- `frontend/`: Vue 3 + Vite + Pinia + vue-router SPA.
- SQLite database defaults to `data/life.db`.
- All life-management routes require cookie auth.

## Domains

- Diary: `src/db/diary.ts`, `src/routes/diary.ts`, `frontend/src/views/DiaryPage.vue`.
- Kanban/Todo: `src/db/kanban.ts`, `src/db/todo.ts`, `src/routes/kanban.ts`, `src/routes/todo.ts`, `frontend/src/views/TodoPage.vue`.
- Finance: `src/db/finance.ts`, `src/routes/finance.ts`, `frontend/src/views/FinancePage.vue`.
- Auth: `src/db/auth.ts`, `src/routes/auth.ts`, `frontend/src/stores/auth.ts`.

## Important Constraints

- Keep this project independent from `../yophon-blog`.
- Use `yophon_life_session` as the session cookie name.
- Do not add blog posts/comments/graffiti code here.
- Prefer small, readable changes matching the existing style.
