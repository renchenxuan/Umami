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
export type { AiFeature, AiDataPolicy } from "./ai-data-policy";
export type { AiConsent } from "./settings";
export interface ImportPreview { valid: boolean; exportVersion: number; schemaVersion: number; counts: Record<string, { incoming: number; conflicts: number }>; settings: { preferencesConflict: boolean; fridgeSettingsConflict: boolean } }
export interface ImportResult { added: Record<string, number>; conflicts: Record<string, number>; conflictTotal: number; clientState: { boardPositions: Record<string, unknown>; hiddenCards: Record<string, unknown>; theme: string }; settingsRestored: { preferencesApplied: boolean; fridgeSettingsApplied: boolean } }
export interface TodayView {
  date: string;
  metrics: { dietKcal: number; calorieTarget: number | null; workoutMinutes: number; habitCompleted: number; latestWeight: number | null };
  expiringIngredients: import("./db/database").Ingredient[];
  recentActivity: Array<{ type: string; id: number; label: string; occurredAt: string }>;
  ai: { configured: boolean; consentGranted: boolean };
}

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
