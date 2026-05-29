# yophon-life 独立开发计划

> 目标：将 `yophon-blog` 中的日记、待办/看板、财务三块私密生活管理功能拆出，作为同级独立项目 `yophon-life` 开发。博客保留公开内容与轻量入口，新项目专注个人生活数据、交互效率与长期扩展。

## 1. 背景与现状

当前 `yophon-blog` 同时承担两类职责：

1. 公开博客：文章、归档、关于、留言、涂鸦等偏公开展示功能。
2. 私密生活管理：日记、待办/看板、财务。

其中日记、待办、财务已经形成了一套独立产品闭环：

```text
看板活动 ─┐
          ├─> 日记时间线 / 每日生活聚合
财务流水 ─┘
```

现有实现中，三块功能已经包含较完整的数据模型、页面交互和后端 API：

- 日记：按月、日历、心情统计、标签、搜索、置顶、关联财务与看板活动。
- 待办/看板：多看板、多列、任务卡片、拖拽排序、列折叠、列尺寸调整、操作活动记录。
- 财务：收入/支出、分类管理、月/年汇总、趋势、分类统计、预算。

继续放在博客项目中会带来几个问题：

- 公开站点和私密生活系统边界不清晰。
- 私密功能会拖大博客项目复杂度。
- 后续若做移动端、PWA、本地优先、数据分析、AI 助手，会明显偏离博客定位。
- 三块功能共享的数据联动更适合作为独立 life-management app 设计。

因此建议新建同级目录：

```text
yophon/
  yophon-blog/   # 继续作为公开博客
  yophon-life/   # 独立生活管理系统
```

## 2. 拆分目标

### 2.1 产品目标

`yophon-life` 定位为个人生活管理系统，核心目标是：

1. 快速记录：日记、任务、收支都能低摩擦新增。
2. 日视角聚合：每天自动形成一个「生活快照」。
3. 月视角复盘：按月查看心情、任务活动、收支趋势。
4. 数据可长期保存、迁移、备份。
5. 后续可扩展到移动端 / PWA / AI 总结。

### 2.2 技术目标

第一阶段不建议大改技术栈，优先降低拆分风险：

- 后端继续使用 Bun + Elysia + SQLite。
- 前端继续使用 Vue 3 + Vite + Pinia + vue-router。
- 先从 `yophon-blog` 复制必要代码，再逐步重构。
- API、DB、页面先保持可运行，再进行模块化优化。

### 2.3 边界目标

从 `yophon-blog` 中拆出：

- 日记功能
- 待办/看板功能
- 财务功能
- 认证相关能力
- 通用 UI 组件中必要部分
- SQLite 初始化、迁移、备份相关逻辑

留在 `yophon-blog` 中：

- 文章系统
- 归档
- 关于页
- 评论
- 涂鸦墙
- 博客导航与公开样式

## 3. 新项目建议结构

建议 `yophon-life` 初始结构如下：

```text
yophon-life/
  CLAUDE.md
  README.md
  package.json
  tsconfig.json
  bun.lockb
  data/
    life.db
  deploy/
    backup.sh
  docs/
    migration-plan.md
    data-model.md
    product-roadmap.md
  src/
    index.ts
    config.ts
    http.ts
    log.ts
    rateLimit.ts
    db/
      index.ts
      auth.ts
      diary.ts
      todo.ts
      kanban.ts
      finance.ts
      activity.ts
    routes/
      _helpers.ts
      auth.ts
      diary.ts
      todo.ts
      kanban.ts
      finance.ts
      timeline.ts
  frontend/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.ts
      router.ts
      App.vue
      assets/
        style.css
      stores/
        auth.ts
      composables/
        useApi.ts
        useMonthNavigation.ts
        useDiary.ts
        useFinance.ts
        useKanban.ts
      components/
        AppModal.vue
        PasswordGate.vue
        EmptyState.vue
        LifeNav.vue
        MonthSwitcher.vue
      views/
        DashboardPage.vue
        DiaryPage.vue
        TodoPage.vue
        FinancePage.vue
        SettingsPage.vue
```

说明：

- `activity.ts` 可承接未来统一活动流，不只记录看板活动。
- `timeline.ts` 可提供按日聚合 API，把日记、任务活动、财务记录统一返回。
- `DashboardPage.vue` 作为新项目首页，展示今天、最近 7 天、本月概览。
- `SettingsPage.vue` 后续承接备份、导入导出、密码、主题、数据管理。

## 4. 拆分范围

## 4.1 后端需要迁移的文件

从 `yophon-blog/src` 迁移或裁剪：

```text
src/config.ts
src/http.ts
src/log.ts
src/rateLimit.ts
src/index.ts
src/db/index.ts
src/db/auth.ts
src/db/diary.ts
src/db/todo.ts
src/db/kanban.ts
src/db/finance.ts
src/routes/_helpers.ts
src/routes/auth.ts
src/routes/diary.ts
src/routes/todo.ts
src/routes/kanban.ts
src/routes/finance.ts
```

需要删除或不迁移：

```text
src/posts.ts
src/graffitiHub.ts
src/db/comments.ts
src/db/graffiti.ts
src/routes/posts.ts
src/routes/comments.ts
src/routes/graffiti.ts
```

`src/index.ts` 需要重写为只挂载 life 相关路由：

```ts
.use(createAuthRoutes(db))
.guard(
  { beforeHandle: authGuard(db) },
  (app) => app
    .use(createDiaryRoutes(db))
    .use(createTodoRoutes(db))
    .use(createKanbanRoutes(db))
    .use(createFinanceRoutes(db))
    .use(createTimelineRoutes(db)),
)
```

## 4.2 前端需要迁移的文件

从 `yophon-blog/frontend/src` 迁移或裁剪：

```text
main.ts
App.vue
router.ts
assets/style.css
stores/auth.ts
composables/useApi.ts
constants/chart.ts
components/AppModal.vue
components/PasswordGate.vue
components/EmptyState.vue
views/DiaryPage.vue
views/TodoPage.vue
views/FinancePage.vue
views/NotFoundPage.vue
```

需要删除或不迁移：

```text
views/HomePage.vue
views/ArticlesPage.vue
views/ArticlePage.vue
views/ArchivePage.vue
views/AboutPage.vue
views/GraffitiPage.vue
components/NavBar.vue
components/AppFooter.vue
components/CommentSection.vue
components/WhiteboardCanvas.vue
```

新建：

```text
components/LifeNav.vue
views/DashboardPage.vue
views/SettingsPage.vue
```

新项目路由建议：

```ts
const routes = [
  { path: '/', component: DashboardPage, meta: { requiresAuth: true } },
  { path: '/diary', component: DiaryPage, meta: { requiresAuth: true } },
  { path: '/todo', component: TodoPage, meta: { requiresAuth: true } },
  { path: '/finance', component: FinancePage, meta: { requiresAuth: true } },
  { path: '/settings', component: SettingsPage, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', component: NotFoundPage },
]
```

## 5. 数据库设计调整

### 5.1 初始版本可复用现有表

第一阶段可直接复用这些表：

```text
sessions
config
diary_entries
kanban_boards
kanban_columns
todo_items
kanban_activity
transactions
finance_categories
budgets
```

新项目 DB 路径建议改成：

```text
data/life.db
```

环境变量：

```env
DB_PATH=data/life.db
YOPHON_DEFAULT_PASSWORD=your-password
APP_ORIGIN=http://localhost:5173
```

### 5.2 建议优先修正的数据问题

#### 5.2.1 日记日期唯一性

当前日记表允许同一天多篇，但前端和聚合逻辑更像一天一篇。建议明确产品设计。

如果决定一天一篇：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_diary_entries_date_unique
ON diary_entries(date);
```

同时 `POST /api/diary` 可以改为 upsert 或在重复日期时报错。

如果决定一天多篇：

- 月视图聚合应支持同日多篇。
- `attachLinkedRecords` 不应使用 `Map<date, entry>` 覆盖同日数据。
- 前端日历点击某天时应展示当天列表，而不是直接编辑单篇。

第一阶段建议选择「一天一篇」，符合当前 UI。

#### 5.2.2 预算总额唯一性

当前 `budgets(month, category)` 在 `category = NULL` 时无法可靠约束总预算唯一。建议将总预算 category 改成特殊值：

```text
__total__
```

表结构保持：

```sql
UNIQUE(month, category)
```

前端展示时把 `__total__` 映射为「总预算」。

或者使用 partial unique index：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_month_total
ON budgets(month)
WHERE category IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_month_category
ON budgets(month, category)
WHERE category IS NOT NULL;
```

第一阶段为了简单，推荐使用 `__total__`。

#### 5.2.3 财务字段校验

后端应补充业务校验：

- `type` 只能是 `income` 或 `expense`。
- `amount` 必须大于 0。
- `date` 必须是 `YYYY-MM-DD`。
- `category` 不能为空。

#### 5.2.4 待办状态语义

当前任务状态主要由 `column_id` 表达，`status` 字段实际弱化。建议第一阶段保留字段，但不要继续在产品语义中依赖它。

后续可选：

- 删除 `status`。
- 或让默认列映射 `todo / doing / done`。
- 或给 column 增加 `kind` 字段。

## 6. 新项目功能规划

## 6.1 第一阶段：原样拆出，可独立运行

目标：让 `yophon-life` 成为一个可以独立启动的项目。

### 后端任务

1. 新建 `yophon-life` 目录。
2. 初始化 `package.json`、`tsconfig.json`。
3. 复制后端通用文件。
4. 裁剪 `src/index.ts`，只保留 auth、diary、todo、kanban、finance。
5. 修改 DB_PATH 默认值为 `data/life.db`。
6. 删除 comments、graffiti、posts 相关逻辑。
7. 确认静态资源服务仍指向 `frontend/dist`。
8. 保留 auth guard，所有业务路由必须登录。

### 前端任务

1. 复制 frontend 基础工程。
2. 裁剪路由，只保留 Dashboard、Diary、Todo、Finance、Settings、NotFound。
3. 删除博客页面和公开组件。
4. 新建 `LifeNav.vue` 替代 `NavBar.vue`。
5. 保留 `PasswordGate.vue`。
6. 调整 App 布局，使其更像应用而不是博客。
7. 确认 `/api` 代理仍能工作。

### 验收标准

- `bun install` 成功。
- `cd frontend && bun install` 成功。
- `bun run dev` 能启动后端。
- `bun run dev:web` 能启动前端。
- 登录后可访问：
  - `/`
  - `/diary`
  - `/todo`
  - `/finance`
  - `/settings`
- 日记、任务、交易都可以新增、编辑、删除。
- 日记页能看到当天财务记录和看板活动。

## 6.2 第二阶段：数据迁移与兼容

目标：从 `yophon-blog/data/yophon.db` 迁移私密数据到 `yophon-life/data/life.db`。

### 迁移方式

建议写一个一次性脚本：

```text
scripts/migrate-from-blog.ts
```

输入：

```text
../yophon-blog/data/yophon.db
```

输出：

```text
data/life.db
```

迁移表：

```text
config
sessions 可选，不建议迁移
diary_entries
kanban_boards
kanban_columns
todo_items
kanban_activity
transactions
finance_categories
budgets
```

不迁移：

```text
comments
graffiti_strokes
posts 文件
```

### 迁移注意事项

1. 迁移前备份原 DB。
2. 不建议迁移 sessions，重新登录更干净。
3. 如调整 budgets 总预算语义，需要把 `category IS NULL` 转成 `__total__`。
4. 如果添加日记 date 唯一约束，要先检查是否存在同日多篇。
5. 迁移完成后跑一次数据一致性检查。

### 一致性检查

建议检查：

- 是否存在空标题任务。
- 是否存在没有 board 的任务。
- 是否存在 column_id 不存在的任务。
- 是否存在 amount <= 0 的交易。
- 是否存在非法 type 的交易。
- 是否存在重复总预算。
- 是否存在重复日期日记。

## 6.3 第三阶段：产品化改造

目标：从“博客内页”变成真正的 life app。

### Dashboard 首页

首页建议展示：

- 今天日期、星期、当前心情。
- 今天日记入口。
- 今天新增/移动/完成的任务。
- 今天收入/支出。
- 本月预算使用率。
- 最近 7 天心情 / 支出 / 活动摘要。

后端可新增：

```text
GET /api/timeline/today
GET /api/timeline/month?year=2026&month=5
GET /api/dashboard/summary
```

### 日记增强

1. 支持 Markdown 或轻量富文本。
2. 自动生成「今日摘要」。
3. 支持附件/图片，后续可放本地文件或对象存储。
4. 支持模板，例如：
   - 今天完成了什么？
   - 今天花钱最多的是？
   - 今天最值得记录的是？
5. 支持从财务/任务记录一键带入正文。

### 看板增强

1. 删除列时支持迁移任务到其他列。
2. 增加完成时间字段。
3. 增加任务归档。
4. 增加任务 due date。
5. 增加任务标签。
6. 拆分 `TodoPage.vue` 为多个组件。

### 财务增强

1. 后端强校验。
2. 分类删除前检查历史交易。
3. 年度视图显示 12 个月趋势。
4. 支持账户维度，例如现金、银行卡、支付宝、微信。
5. 支持周期性账单。
6. 支持导入 CSV。
7. 支持导出 CSV/JSON。

### 设置页

设置页建议包含：

- 修改密码。
- 数据备份。
- 数据导入导出。
- 主题设置。
- 数据清理。
- 关于本应用。

## 7. 推荐实施顺序

### Step 1：创建独立项目骨架

目录：

```text
yophon/yophon-life
```

先只放最小可运行结构。

### Step 2：复制并裁剪后端

优先保证 API 能启动。

建议先跑：

```bash
bun run dev
```

确认没有引用 posts/comments/graffiti。

### Step 3：复制并裁剪前端

先让三个页面跑起来，不急着改 UI。

建议先跑：

```bash
bun run dev:web
```

### Step 4：调整导航和首页

把原博客导航改成 life app 导航。

初始导航：

```text
首页 / 日记 / 看板 / 财务 / 设置
```

### Step 5：修正 P0 数据问题

优先处理：

1. 预算总额唯一性。
2. 日记一天一篇约束。
3. 财务 amount/type/date 后端校验。

### Step 6：迁移真实数据

写一次性迁移脚本，迁移前备份。

### Step 7：产品化首页和时间线

新增 Dashboard / Timeline API，把三块数据的联动能力正式产品化。

## 8. 风险与应对

### 风险 1：复制代码后引用残留

可能出现 `posts`、`comments`、`graffiti`、`NavBar`、`AppFooter` 之类残留引用。

应对：

- 全局搜索关键词。
- 先让 TypeScript 编译通过。
- 启动时逐个访问页面。

### 风险 2：真实数据迁移破坏原库

应对：

- 迁移脚本只读原库。
- 输出新库。
- 迁移前复制备份。
- 不直接在原 `yophon.db` 上改 schema。

### 风险 3：新旧项目同时使用同一 cookie 名

如果两个项目部署在同域，session cookie 可能冲突。

应对：

- 新项目使用新的 cookie name，例如：

```text
yophon_life_session
```

- 或者部署到不同子域。

### 风险 4：功能拆出后博客入口丢失

应对：

- 博客保留一个私密入口链接，或完全隐藏。
- 可在 `yophon-blog` 的后台/私密入口跳转到 `yophon-life`。

### 风险 5：页面代码过大，后续维护困难

应对：

- 第一阶段不重构，保证拆分成功。
- 第二阶段再拆组件和 composables。

## 9. 建议的 README 初始说明

```md
# yophon-life

个人生活管理系统，拆分自 yophon-blog 的日记、看板、财务模块。

## 功能

- 日记：心情、标签、日历、搜索、每日聚合。
- 看板：多看板、多列、任务拖拽、活动记录。
- 财务：收入支出、分类、预算、统计图表。

## 开发

```bash
bun install
cd frontend && bun install

# 后端
bun run dev

# 前端
bun run dev:web
```

## 环境变量

```env
DB_PATH=data/life.db
YOPHON_DEFAULT_PASSWORD=your-password
APP_ORIGIN=http://localhost:5173
```
```

## 10. 第一版任务清单

### 项目初始化

- [ ] 创建 `yophon-life` 目录。
- [ ] 创建 root `package.json`。
- [ ] 创建 root `tsconfig.json`。
- [ ] 创建 `frontend/package.json`。
- [ ] 创建 `frontend/vite.config.ts`。
- [ ] 创建 `CLAUDE.md`。
- [ ] 创建 `README.md`。

### 后端拆分

- [ ] 迁移 `config.ts`。
- [ ] 迁移 `http.ts`。
- [ ] 迁移 `log.ts`。
- [ ] 迁移 `rateLimit.ts`。
- [ ] 迁移 auth db/routes。
- [ ] 迁移 diary db/routes。
- [ ] 迁移 todo db/routes。
- [ ] 迁移 kanban db/routes。
- [ ] 迁移 finance db/routes。
- [ ] 裁剪 `index.ts`。
- [ ] 修改默认 DB 路径为 `data/life.db`。
- [ ] 修改 cookie name 为 `yophon_life_session`。

### 前端拆分

- [ ] 迁移 `main.ts`。
- [ ] 迁移 `App.vue` 并裁剪博客布局。
- [ ] 重写 `router.ts`。
- [ ] 迁移 `style.css`。
- [ ] 迁移 `auth.ts` store。
- [ ] 迁移 `useApi.ts`。
- [ ] 迁移 `AppModal.vue`。
- [ ] 迁移 `PasswordGate.vue`。
- [ ] 迁移 `EmptyState.vue`。
- [ ] 迁移 `DiaryPage.vue`。
- [ ] 迁移 `TodoPage.vue`。
- [ ] 迁移 `FinancePage.vue`。
- [ ] 新建 `LifeNav.vue`。
- [ ] 新建 `DashboardPage.vue`。
- [ ] 新建 `SettingsPage.vue`。

### 数据修正

- [ ] 决定日记是否一天一篇。
- [ ] 如一天一篇，添加 date unique index。
- [ ] 修正 budgets 总预算唯一性。
- [ ] 增加 finance 后端校验。
- [ ] 检查 todo column_id 与 board_id 一致性。

### 验收

- [ ] 后端启动成功。
- [ ] 前端启动成功。
- [ ] 登录成功。
- [ ] 日记 CRUD 成功。
- [ ] 看板 CRUD 成功。
- [ ] 任务拖拽成功。
- [ ] 财务 CRUD 成功。
- [ ] 日记页联动展示看板活动。
- [ ] 日记页联动展示财务记录。
- [ ] 生产 build 成功。

## 11. 结论

建议先做「低风险拆分」，不要一开始就重构太多。

最合理路线是：

```text
复制可运行版本
  -> 裁剪博客功能
  -> 修正数据一致性问题
  -> 迁移真实数据
  -> 做 Dashboard 和 Timeline
  -> 再逐步组件化和产品化
```

这三块功能本身已经具备独立产品雏形，拆出来之后可以把重点从“博客附属页面”转向“个人生活系统”：每日记录、月度复盘、任务与财务自动沉淀到日记。