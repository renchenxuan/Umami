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

  private runtime(conversationId: number, initialModel: Model<any>): Runtime {
    const existing = this.runtimes.get(conversationId);
    if (existing) return existing;
    const runtime: Runtime = { agent: null as unknown as Agent, chain: Promise.resolve(), currentWriter: null, currentAbortToken: null, apiKey: "" };
    runtime.agent = this.factory({
      conversationId,
      model: initialModel,
      getApiKey: () => runtime.apiKey || undefined,
      onProposal: (proposal) => runtime.currentWriter?.({ type: "action_proposed", action: proposal }),
    });
    runtime.agent.subscribe((event) => {
      const writer = runtime.currentWriter;
      if (!writer) return;
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") writer({ type: "delta", text: event.assistantMessageEvent.delta });
      if (event.type === "tool_execution_start") writer({ type: "tool_status", phase: "start", name: event.toolName });
      if (event.type === "tool_execution_update") writer({ type: "tool_status", phase: "update", name: event.toolName });
      if (event.type === "tool_execution_end") writer({ type: "tool_status", phase: "end", name: event.toolName, isError: event.isError });
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
}
