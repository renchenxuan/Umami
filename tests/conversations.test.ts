import { afterEach, describe, expect, test } from "bun:test";
import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";
import { RecipeDB } from "../src/db/database";
import { SettingsStore } from "../src/settings";
import type { SecretStore } from "../src/secrets";
import { startServer } from "../src/server/server";
import { ConversationAgentManager, type ConversationAgentOptions } from "../src/server/conversations";
import { createAllTools } from "../src/tools";

class MemorySecrets implements SecretStore {
  readonly persistence = "environment-only" as const;
  private values = new Map<string, string>();
  get(name: string) { return this.values.get(name) ?? ""; }
  set(name: string, value: string) { this.values.set(name, value); }
  delete(name: string) { this.values.delete(name); }
}

const model = {
  api: "openai-completions",
  provider: "openai",
  id: "test-model",
  name: "Test",
  baseUrl: "https://example.test",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 10000,
  maxTokens: 1000,
} as any;

const assistantMessage = (content: string): AgentMessage => ({
  role: "assistant",
  content: [{ type: "text", text: content }],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: { input: 123, output: 45, cacheRead: 0, cacheWrite: 0, totalTokens: 168, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  stopReason: "stop",
  timestamp: Date.now(),
} as AgentMessage);

class FakeAgent {
  state: any = { model, messages: [], errorMessage: undefined };
  signal: AbortSignal | undefined;
  aborted = false;
  histories: AgentMessage[][] = [];
  private listeners = new Set<(event: AgentEvent, signal: AbortSignal) => void | Promise<void>>();
  private controller: AbortController | null = null;
  constructor(private options: ConversationAgentOptions, private db: RecipeDB) {}
  subscribe(listener: (event: AgentEvent, signal: AbortSignal) => void | Promise<void>) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  abort() { this.aborted = true;this.controller?.abort(); }
  async prompt(text: string) {
    this.histories.push([...this.state.messages]);
    const controller = new AbortController();this.controller=controller;this.signal = controller.signal;
    const emit = async (event: AgentEvent) => { for (const listener of this.listeners) await listener(event, controller.signal); };
    await emit({ type: "tool_execution_start", toolCallId: "tool-1", toolName: "save_ingredients", args: {} });
    this.options.onProposal(this.db.createAgentAction(this.options.conversationId, "save_ingredients", { ingredients: [{ name: `会话${this.options.conversationId}` }] }));
    await emit({ type: "tool_execution_end", toolCallId: "tool-1", toolName: "save_ingredients", result: {}, isError: false });
    await new Promise(resolve => setTimeout(resolve, 10));
    if (controller.signal.aborted) return;
    const answer = `会话${this.options.conversationId}:${text}`;
    const assistant = assistantMessage(answer);
    await emit({ type: "message_update", message: assistant, assistantMessageEvent: { type: "text_delta", delta: answer } as any });
    this.state.messages.push({ role: "user", content: text, timestamp: Date.now() }, assistant);
  }
}

const parseSse = async (response: Response) => (await response.text()).split(/\r?\n/).filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));

const contexts: Array<{server:ReturnType<typeof Bun.serve>;db:RecipeDB}> = [];
afterEach(() => { for (const context of contexts.splice(0)) { context.server.stop(true); context.db.close(); } });

function setup(db = new RecipeDB(":memory:")) {
  const settings = new SettingsStore(db, new MemorySecrets());settings.setModelName("openai");settings.setKey("openai", "test-key");
  const models = { getModel: () => model, setProvider: () => {}, streamSimple: async () => { throw new Error("not used"); }, completeSimple: async () => ({ stopReason: "stop" }) } as any;
  const agents = new Map<number, FakeAgent>();
  const factory = (options: ConversationAgentOptions) => { const agent = new FakeAgent(options, db);agents.set(options.conversationId, agent);return agent as any; };
  const seed = factory({ conversationId: -1, model, getApiKey: () => "test-key", onProposal: () => {} });
  const server = startServer(seed as any, db, settings, models, { port: 0, conversationAgentFactory: factory });contexts.push({server,db});
  const endpoint = `http://127.0.0.1:${server.port}`;
  return { db, agents, server, endpoint, settings, models, factory };
}

describe("conversation agent streaming", () => {
  test("confirm-tier write tools create proposals without executing; auto-tier writes directly", async () => {
    const db = new RecipeDB(":memory:");
    try {
      const conversationId = db.createConversation("工具确认");
      const tools = createAllTools(db, {} as any, () => model, { conversationId });
      // 高风险写入（CONFIRM_WRITE_TOOLS）：先生成待确认提案，不执行原变更
      const update = tools.find(tool => tool.name === "update_preferences")!;
      const result = await update.execute("call", { taste_preference: "清淡" }, undefined);
      expect(db.getPreferences().taste_preference).toBe("家常");
      const actions = db.getAgentActions({ conversationId, status: "pending" });
      expect(actions).toHaveLength(1);
      expect(actions[0].action_type).toBe("update_preferences");
      expect((result.details as any).actionProposal.status).toBe("pending");
      // 轻量记录（AUTO_WRITE_TOOLS）：直接落库，不生成提案
      const save = tools.find(tool => tool.name === "save_ingredients")!;
      await save.execute("call", { ingredients: [{ name: "土豆", quantity: "2个" }] }, undefined);
      expect(db.getIngredients()).toHaveLength(1);
      expect(db.getAgentActions({ conversationId })).toHaveLength(1);
    } finally { db.close(); }
  });

  test("isolates two conversations and emits the v1 SSE vocabulary", async () => {
    const ctx = setup();const first = ctx.db.createConversation("一");const second = ctx.db.createConversation("二");
    const [one, two] = await Promise.all([
      fetch(`${ctx.endpoint}/api/v1/conversations/${first}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "你好" }) }),
      fetch(`${ctx.endpoint}/api/v1/conversations/${second}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "世界" }) }),
    ]);
    const [eventsOne, eventsTwo] = await Promise.all([parseSse(one), parseSse(two)]);
    expect(ctx.agents.get(first)).not.toBe(ctx.agents.get(second));
    for (const events of [eventsOne, eventsTwo]) {
      expect(events.map(event => event.type)).toEqual(["start", "tool_status", "action_proposed", "tool_status", "delta", "done"]);
    }
    expect(ctx.db.getMessages(first).map(message => message.content)).toEqual(["你好", `会话${first}:你好`]);
    expect(ctx.db.getMessages(second).map(message => message.content)).toEqual(["世界", `会话${second}:世界`]);
    const doneOne = eventsOne.find(event => event.type === "done");
    expect(doneOne?.usage).toEqual({ input: 123, output: 45, cacheRead: 0, totalTokens: 168, cost: 0 });
    const persisted = ctx.db.getMessages(first)[1];
    expect((persisted.metadata as any)?.usage).toEqual({ input: 123, output: 45, cacheRead: 0, totalTokens: 168, cost: 0 });
    expect(ctx.db.getIngredients()).toHaveLength(0);
    expect(ctx.db.getAgentActions({ conversationId: first })[0]?.status).toBe("pending");
  });

  test("applies the configured thinking level per request and rejects invalid values", async () => {
    const ctx = setup();
    expect(() => ctx.settings.setThinkingLevel("banana")).toThrow();
    ctx.settings.setThinkingLevel("high");
    const id = ctx.db.createConversation("推理");
    await parseSse(await fetch(`${ctx.endpoint}/api/v1/conversations/${id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "聊聊" }) }));
    expect(ctx.agents.get(id)!.state.thinkingLevel).toBe("high");
  });

  test("restores persisted messages into a fresh conversation agent with a bounded window", async () => {
    const ctx = setup();const id = ctx.db.createConversation("恢复");
    await parseSse(await fetch(`${ctx.endpoint}/api/v1/conversations/${id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "第一轮" }) }));
    const firstAgent = ctx.agents.get(id)!;
    expect(firstAgent.histories[0]).toHaveLength(0);
    // Drop only the in-memory runtime by restarting the server; SQLite remains the source of truth.
    ctx.server.stop(true);const tracked=contexts.findIndex(item=>item.server===ctx.server);if(tracked>=0)contexts.splice(tracked,1);
    const restarted = setup(ctx.db);
    await parseSse(await fetch(`${restarted.endpoint}/api/v1/conversations/${id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "第二轮" }) }));
    const restored = restarted.agents.get(id)!.histories[0]!;
    expect(restored.map(message => message.role)).toEqual(["user", "assistant"]);
    expect((restored[0] as any).content).toBe("第一轮");
    expect((restored[1] as any).content[0].text).toBe(`会话${id}:第一轮`);
  });

  test("aborts only the disconnected conversation Agent", async () => {
    const ctx=setup();const first=ctx.db.createConversation("断连");const second=ctx.db.createConversation("保留");
    const manager=new ConversationAgentManager(ctx.db,ctx.settings,ctx.models,ctx.factory);
    const controller=new AbortController();
    const request=new Request(`http://127.0.0.1/api/v1/conversations/${first}/messages`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:"会中断"}),signal:controller.signal});
    const response=await manager.response(request,first);const reader=response.body!.getReader();await reader.read();controller.abort();
    await new Promise(resolve=>setTimeout(resolve,20));
    expect(ctx.agents.get(first)!.aborted).toBe(true);
    expect(ctx.agents.get(second)).toBeUndefined();
    expect(ctx.db.getMessages(first).filter(message=>message.role==="assistant")).toHaveLength(0);
  });
});
