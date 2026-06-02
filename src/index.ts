import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { INTERNAL_REMOTE_IP_HEADER, serverConfig } from "./config";
import { initDb } from "./db";
import { logRequest } from "./log";
import { authGuard, cleanupAuthLimiter, createAuthRoutes } from "./routes/auth";
import { createDiaryRoutes } from "./routes/diary";
import { createFinanceRoutes } from "./routes/finance";
import { createKanbanRoutes } from "./routes/kanban";
import { createTodoRoutes } from "./routes/todo";

const db = initDb();

setInterval(() => {
  cleanupAuthLimiter();
}, 10 * 60 * 1000);

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof Response) return error;
    if ((error as Error).message === "INVALID_ID") {
      set.status = 400;
      return { error: "无效的 ID" };
    }
    if ((error as Error).message.startsWith("INVALID_TRANSACTION_")) {
      set.status = 400;
      return { error: "财务记录参数不合法" };
    }
    if ((error as Error).message === "TODO_NOT_FOUND") {
      set.status = 404;
      return { error: "任务不存在" };
    }
    if ((error as Error).message.startsWith("INVALID_TODO_") || (error as Error).message.startsWith("INVALID_COLUMN_") || (error as Error).message.startsWith("INVALID_BOARD_") || (error as Error).message === "INVALID_SORT_ORDER") {
      set.status = 400;
      return { error: "看板参数不合法" };
    }
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "请求参数不合法" };
    }
    console.error(error);
    set.status = 500;
    return { error: "服务器开小差了，请稍后再试" };
  })
  .use(cors({
    origin: serverConfig.appOrigin ? [serverConfig.appOrigin] : true,
    credentials: true,
  }))
  .use(createAuthRoutes(db))
  .guard(
    { beforeHandle: authGuard(db) },
    (app) => app
      .use(createDiaryRoutes(db))
      .use(createTodoRoutes(db))
      .use(createKanbanRoutes(db))
      .use(createFinanceRoutes(db)),
  );

const DIST_DIR = serverConfig.distDir;

Bun.serve({
  hostname: serverConfig.host,
  port: serverConfig.port,
  async fetch(req, server) {
    const start = Date.now();
    const headers = new Headers(req.headers);
    const remoteIp = server.requestIP(req)?.address;
    if (remoteIp) headers.set(INTERNAL_REMOTE_IP_HEADER, remoteIp);

    const request = new Request(req, { headers });
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/api/")) {
      const response = await app.handle(request);
      logRequest(request, response.status, start);
      return response;
    }

    if (path !== "/") {
      const filePath = join(DIST_DIR, path);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const isHashedAsset = path.startsWith("/assets/");
        return new Response(file, {
          headers: isHashedAsset
            ? { "Cache-Control": "public, max-age=31536000, immutable" }
            : { "Cache-Control": "public, max-age=3600" },
        });
      }
    }

    return new Response(Bun.file(join(DIST_DIR, "index.html")));
  },
});

if (!existsSync(DIST_DIR)) {
  console.warn(`⚠️  Static asset directory not found: ${DIST_DIR}`);
}

console.log(`🚀 yophon life running at http://${serverConfig.host}:${serverConfig.port}`);
