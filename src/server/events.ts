import type { SSEEvent } from "../api-types";

/**
 * 服务端级事件总线：把「与单个 HTTP 请求无关」的事件（定时任务触发等）
 * 推给长驻的 /api/v1/events 订阅者。会话内的流式事件仍走
 * ConversationAgentManager 的请求级 writer，两者互不干扰。
 */
const listeners = new Set<(event: SSEEvent) => void>();

export function subscribeServerEvents(listener: (event: SSEEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcastServerEvent(event: SSEEvent): void {
  for (const listener of listeners) {
    try { listener(event); } catch { listeners.delete(listener); }
  }
}
