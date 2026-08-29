import type { AgentActionProposal as StoredAgentActionProposal, Conversation, Message } from "./db/database";

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId: string;
}

export type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: ApiError };

export type AgentActionProposal = StoredAgentActionProposal;
export type { Conversation, Message };

export type SSEEvent =
  | { type: "start"; conversationId: number; messageId: number }
  | { type: "delta"; text: string }
  | { type: "tool_status"; phase: "start" | "update" | "end"; name: string; isError?: boolean }
  | { type: "action_proposed"; action: AgentActionProposal }
  | { type: "action_committed"; action: AgentActionProposal }
  | { type: "agent_state"; active: boolean }
  | { type: "schedule_fired"; scheduleId: number; conversationId: number; title: string }
  | { type: "done"; messageId?: number; usage?: StreamUsage }
  | { type: "error"; code: string; message: string };

/** 本轮回复的 token 用量（用于前端展示与持久化）。 */
export interface StreamUsage {
  input: number;
  output: number;
  cacheRead: number;
  totalTokens: number;
  cost: number;
}
