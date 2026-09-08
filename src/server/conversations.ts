import type { Agent } from "@earendil-works/pi-agent-core";
import type { ImageContent, Model } from "@earendil-works/pi-ai";
import type { RecipeDB } from "../db/database";
import type { SettingsStore } from "../settings";
import type { ModelsCollection } from "../models";
import { getModelByName } from "../models";
import type { SSEEvent, StreamUsage } from "../api-types";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, readJson } from "./api";
import { safeProviderMessage } from "./errors";
import { restoreAgentMessages } from "../agent";

export interface ConversationAgentOptions {
  conversationId: number;
  model: Model<any>;
  getApiKey: (provider: string) => string | undefined;
  onProposal: (proposal: import("../db/database").AgentActionProposal) => void;
  onCommit?: (action: import("../db/database").AgentActionProposal) => void;
}

export type ConversationAgentFactory = (options: ConversationAgentOptions) => Agent;

interface Runtime {
  agent: Agent;
  chain: Promise<void>;
  currentWriter: ((event: SSEEvent) => void) | null;
  currentAbortToken: object | null;
  apiKey: string;
}

type MessageBody = { text?: unknown; imageBase64?: unknown; mimeType?: unknown };

/** 定时触发等待模型回复的上限被突破时，回填的 modelError（提醒本身已落库）。 */
export const SCHEDULED_TIMEOUT_MESSAGE = "等待模型回复超时，已放弃本次回复（提醒已记录）";

/** 常驻会话 runtime 上限；超限时淘汰最久未使用且空闲的会话（Map 为插入序，遍历即 LRU 近似）。 */
export const MAX_RUNTIMES = 20;

export interface ScheduledRunResult {
  conversationId: number;
  userMessageId: number;
  assistantMessageId?: number;
  modelError?: string;
}

function base64Payload(value: string): string {
  const comma = value.indexOf(",");
  return comma >= 0 && value.startsWith("data:") ? value.slice(comma + 1) : value;
}

function extractText(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } => !!part && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("");
}

function sseResponseError(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export class ConversationAgentManager {
  private readonly runtimes = new Map<number, Runtime>();

  constructor(
    private readonly db: RecipeDB,
    private readonly settings: SettingsStore,
    private readonly models: ModelsCollection,
    private readonly factory: ConversationAgentFactory,
  ) {}

  /** 丢弃一个会话的 runtime；正在流式输出的请求仍持有该对象引用，不会中断。 */
  private dropRuntime(conversationId: number): void {
    this.runtimes.delete(conversationId);
  }

  /** 淘汰最久未使用且空闲的 runtime，避免长跑时内存随会话数线性增长。 */
  private evictIfNeeded(): void {
    if (this.runtimes.size < MAX_RUNTIMES) return;
    for (const [id, runtime] of this.runtimes) {
      if (runtime.currentWriter || runtime.currentAbortToken) continue;
      this.runtimes.delete(id);
      if (this.runtimes.size < MAX_RUNTIMES) return;
    }
  }

  private runtime(conversationId: number, initialModel: Model<any>): Runtime {
    const existing = this.runtimes.get(conversationId);
    if (existing) return existing;
    this.evictIfNeeded();
    const runtime: Runtime = { agent: null as unknown as Agent, chain: Promise.resolve(), currentWriter: null, currentAbortToken: null, apiKey: "" };
    runtime.agent = this.factory({
      conversationId,
      model: initialModel,
      getApiKey: () => runtime.apiKey || undefined,
      onProposal: (proposal) => runtime.currentWriter?.({ type: "action_proposed", action: proposal }),
      onCommit: (action) => runtime.currentWriter?.({ type: "action_committed", action }),
    });
    runtime.agent.subscribe((event) => {
      const writer = runtime.currentWriter;
      if (!writer) return;
      if (event.type === "agent_start") writer({ type: "agent_state", active: true });
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") writer({ type: "delta", text: event.assistantMessageEvent.delta });
      if (event.type === "tool_execution_start") writer({ type: "tool_status", phase: "start", name: event.toolName });
      if (event.type === "tool_execution_update") writer({ type: "tool_status", phase: "update", name: event.toolName });
      if (event.type === "tool_execution_end") writer({ type: "tool_status", phase: "end", name: event.toolName, isError: event.isError });
      if (event.type === "agent_end") writer({ type: "agent_state", active: false });
    });
    this.runtimes.set(conversationId, runtime);
    return runtime;
  }

  async response(req: Request, conversationId: number): Promise<Response> {
    const conversation = this.db.getConversation(conversationId);
    if (!conversation) return sseResponseError("NOT_FOUND", "对话不存在", 404);
    let raw: Record<string, unknown>;
    try { raw = await readJson(req); }
    catch (error) { return error instanceof Response ? sseResponseError("PAYLOAD_TOO_LARGE", "请求体过大", 413) : sseResponseError("VALIDATION_ERROR", "请求体必须是 JSON 对象", 422); }
    const body = raw as MessageBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? base64Payload(body.imageBase64) : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
    if (!text && !imageBase64) return sseResponseError("EMPTY_MESSAGE", "消息不能为空", 422);
    if (text.length > 100_000) return sseResponseError("VALIDATION_ERROR", "text 不能超过 100000 个字符", 422);
    if (imageBase64 && !ALLOWED_IMAGE_TYPES.has(mimeType)) return sseResponseError("UNSUPPORTED_IMAGE", "仅支持 JPEG、PNG 和 WebP 图片", 415);
    if (imageBase64 && Math.ceil(imageBase64.length * 3 / 4) > MAX_IMAGE_BYTES) return sseResponseError("IMAGE_TOO_LARGE", "图片不能超过 5 MiB", 413);
    if (!this.settings.getAiConsent().granted) return sseResponseError("AI_CONSENT_REQUIRED", "请先在设置中心完成一次 AI 数据授权", 428);

    let model: Model<any>;
    const providerName = this.settings.getModelName();
    try { model = getModelByName(this.models, this.settings, providerName); }
    catch (error) { return sseResponseError("MODEL_NOT_CONFIGURED", safeProviderMessage(error, this.settings.getSecretValues()), 422); }
    const apiKey = this.settings.getKey(providerName);
    if (!apiKey) return sseResponseError("MODEL_NOT_CONFIGURED", `模型 "${providerName}" 缺少 API Key`, 422);
    const snapshot = { model, apiKey };
    const runtime = this.runtime(conversationId, snapshot.model);
    const images: ImageContent[] = imageBase64 ? [{ type: "image", data: imageBase64, mimeType }] : [];
    const encoder = new TextEncoder();
    let cancelled = false;
    let abortToken: object | null = null;
    const cancelCurrent = () => {
      cancelled = true;
      if (abortToken && runtime.currentAbortToken === abortToken) runtime.agent.abort();
    };
    req.signal.addEventListener("abort", cancelCurrent, { once: true });

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        let closed = false;
        const heartbeat = setInterval(() => {
          if (!closed && !cancelled) try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch { closed = true;clearInterval(heartbeat); }
        }, 15_000);
        const writer = (event: SSEEvent) => {
          if (closed || cancelled) return;
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { closed = true; }
        };
        const close = () => { clearInterval(heartbeat);if (!closed) { closed = true; try { controller.close(); } catch {} } };
        const task = async () => {
          if (cancelled) { req.signal.removeEventListener("abort", cancelCurrent);close();return; }
          abortToken = {};
          runtime.currentAbortToken = abortToken;
          runtime.currentWriter = writer;
          runtime.apiKey = snapshot.apiKey;
          runtime.agent.state.model = snapshot.model;
          try {
            const persisted = this.db.getMessages(conversationId, 40);
            runtime.agent.state.messages = restoreAgentMessages(persisted, snapshot.model);
            runtime.agent.state.thinkingLevel = this.settings.getThinkingLevel();
            const userMessageId = this.db.addMessage(conversationId, "user", text || "[图片]", imageBase64 ? { image: { mimeType, bytes: Math.ceil(imageBase64.length * 3 / 4) } } : {});
            writer({ type: "start", conversationId, messageId: userMessageId });
            await runtime.agent.prompt(text, images);
            if (cancelled || runtime.agent.signal?.aborted) return;
            const error = runtime.agent.state.errorMessage;
            if (error) { writer({ type: "error", code: "MODEL_ERROR", message: safeProviderMessage(error, this.settings.getSecretValues()) }); return; }
            const assistant = [...runtime.agent.state.messages].reverse().find((message) => message.role === "assistant");
            const assistantText = extractText(assistant).trim();
            // token 用量随消息元数据落库（复用现有 JSON 列），并随 done 事件回传前端展示。
            const usage = assistant?.role === "assistant" ? assistant.usage : undefined;
            const streamUsage: StreamUsage | undefined = usage && usage.totalTokens
              ? { input: usage.input, output: usage.output, cacheRead: usage.cacheRead, totalTokens: usage.totalTokens, cost: usage.cost?.total ?? 0 }
              : undefined;
            const assistantMessageId = assistantText
              ? this.db.addMessage(conversationId, "assistant", assistantText, { model: `${snapshot.model.provider}/${snapshot.model.id}`, usage: streamUsage ?? null })
              : undefined;
            writer({ type: "done", messageId: assistantMessageId, usage: streamUsage });
          } catch (error) {
            if (!cancelled) writer({ type: "error", code: "AGENT_ERROR", message: safeProviderMessage(error, this.settings.getSecretValues()) });
          } finally {
            if (runtime.currentAbortToken === abortToken) { runtime.currentAbortToken = null; runtime.currentWriter = null; }
            req.signal.removeEventListener("abort", cancelCurrent);
            close();
          }
        };
        runtime.chain = runtime.chain.then(task, task);
      },
      cancel: cancelCurrent,
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-store", "Connection": "keep-alive" } });
  }

  /**
   * 定时任务触发：把提醒作为带 scheduled 标记的用户消息写入会话，
   * 若模型可用则让 Agent 生成一段回应并落库。与用户请求共用 runtime.chain 串行化，
   * 不会打断正在进行的对话；未配置模型时提醒消息仍然可见（本地优先）。
   *
   * 传入 signal 时：超时会中断 Agent 当前 run，并直接丢弃该会话的 runtime
   * （下次访问重建），避免一次挂起的模型调用长期占用 runtime.chain，
   * 连带阻塞该会话的后续对话与后续定时任务。
   */
  async runScheduled(
    conversationId: number,
    schedule: { id: number; title: string; message: string },
    options: { signal?: AbortSignal } = {},
  ): Promise<ScheduledRunResult> {
    const content = `⏰ 定时任务「${schedule.title}」触发\n\n${schedule.message}`;
    const userMessageId = this.db.addMessage(conversationId, "user", content, { scheduled: true, scheduleId: schedule.id, scheduleTitle: schedule.title });
    const providerName = this.settings.getModelName();
    const apiKey = this.settings.getKey(providerName);
    let model: Model<any> | null = null;
    try { model = getModelByName(this.models, this.settings, providerName); } catch { model = null; }
    if (!this.settings.getAiConsent().granted) return { conversationId, userMessageId, modelError: "AI_CONSENT_REQUIRED：已记录提醒，但未发送用户内容" };
    if (!model || !apiKey) return { conversationId, userMessageId, modelError: `模型 "${providerName}" 未配置，已记录提醒但未生成回复` };
    const snapshot = { model, apiKey };
    const runtime = this.runtime(conversationId, snapshot.model);
    const signal = options.signal;
    // Agent.prompt() 不接受 signal，只能借 agent.abort() 中断当前 run。
    const onAbort = () => runtime.agent.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const task = async (): Promise<ScheduledRunResult> => {
      runtime.apiKey = snapshot.apiKey;
      runtime.agent.state.model = snapshot.model;
      try {
        if (signal?.aborted) return { conversationId, userMessageId, modelError: SCHEDULED_TIMEOUT_MESSAGE };
        const persisted = this.db.getMessages(conversationId, 40);
        runtime.agent.state.messages = restoreAgentMessages(persisted, snapshot.model);
        runtime.agent.state.thinkingLevel = this.settings.getThinkingLevel();
        await runtime.agent.prompt(content);
        if (signal?.aborted) return { conversationId, userMessageId, modelError: SCHEDULED_TIMEOUT_MESSAGE };
        const error = runtime.agent.state.errorMessage;
        if (error) return { conversationId, userMessageId, modelError: safeProviderMessage(error, this.settings.getSecretValues()) };
        const assistant = [...runtime.agent.state.messages].reverse().find((message) => message.role === "assistant");
        const assistantText = extractText(assistant).trim();
        const usage = assistant?.role === "assistant" ? assistant.usage : undefined;
        const streamUsage: StreamUsage | undefined = usage && usage.totalTokens
          ? { input: usage.input, output: usage.output, cacheRead: usage.cacheRead, totalTokens: usage.totalTokens, cost: usage.cost?.total ?? 0 }
          : undefined;
        const assistantMessageId = assistantText
          ? this.db.addMessage(conversationId, "assistant", assistantText, { model: `${snapshot.model.provider}/${snapshot.model.id}`, usage: streamUsage ?? null, scheduled: true, scheduleId: schedule.id })
          : undefined;
        return { conversationId, userMessageId, assistantMessageId };
      } catch (error) {
        return { conversationId, userMessageId, modelError: safeProviderMessage(error, this.settings.getSecretValues()) };
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }
    };
    const result = runtime.chain.then(task, task);
    if (!signal) return result;
    // 即使 agent.abort() 没能真正解开挂起的调用，也要在超时那一刻放弃等待：
    // 丢弃 runtime 让下次访问重建，保证该会话不会被一条挂起的链永久占住。
    const timedOut = new Promise<ScheduledRunResult>((resolve) => {
      const finish = () => {
        signal.removeEventListener("abort", onAbort);
        this.dropRuntime(conversationId);
        resolve({ conversationId, userMessageId, modelError: SCHEDULED_TIMEOUT_MESSAGE });
      };
      if (signal.aborted) finish();
      else signal.addEventListener("abort", finish, { once: true });
    });
    return Promise.race([result, timedOut]);
  }
}
