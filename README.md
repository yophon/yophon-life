# yophon-life

从 `yophon-blog` 拆出的个人生活管理系统，聚焦日记、看板、财务三块私密功能。

## 功能

- 日记：心情、标签、日历、搜索、置顶、每日聚合。
- 看板：多看板、多列、任务拖拽、活动记录。
- 财务：收入支出、分类、预算、统计图表。

## 开发

```bash
bun install
cd frontend && bun install

# 后端 API，默认 http://127.0.0.1:3000
bun run dev

# 前端 Vite，默认 http://localhost:5173
bun run dev:web
```

## 环境变量

```env
DB_PATH=data/life.db
YOPHON_DEFAULT_PASSWORD=your-password
APP_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
SESSION_TTL_SECONDS=15552000
```

`SESSION_TTL_SECONDS` controls how long login sessions stay valid. The default is 180 days.

## 说明

本项目是独立项目，不依赖也不修改 `../yophon-blog`。详细拆分计划见 `PLAN.md`。
