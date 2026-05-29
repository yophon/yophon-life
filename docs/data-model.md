# yophon-life 数据说明

默认 SQLite 数据库路径：`data/life.db`。

## 当前表

- `sessions`：登录会话。
- `config`：配置项，当前用于保存密码 hash。
- `diary_entries`：日记。
- `kanban_boards`：看板。
- `kanban_columns`：看板列。
- `todo_items`：任务。
- `kanban_activity`：看板活动，会显示到日记时间线。
- `transactions`：财务流水。
- `finance_categories`：财务分类。
- `budgets`：预算。

## 独立边界

- 不读取 `../yophon-blog/data/yophon.db`。
- 不创建博客、评论、涂鸦相关表。
- session cookie 使用 `yophon_life_session`。
- 总预算使用 `__total__` 作为内部分类值，避免 SQLite `NULL` unique 约束问题。
