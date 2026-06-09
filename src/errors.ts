/**
 * Application-level error carrying an HTTP status and a user-facing (Chinese)
 * message. db/route layers throw these; the top-level `onError` handler reads
 * `status`/`userMessage` directly, replacing fragile message-prefix matching.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

export const invalidId = () => new AppError(400, "无效的 ID");
export const invalidKanban = () => new AppError(400, "看板参数不合法");
export const invalidTransaction = () => new AppError(400, "财务记录参数不合法");
export const todoNotFound = () => new AppError(404, "任务不存在");
