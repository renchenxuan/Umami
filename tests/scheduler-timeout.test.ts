import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { SettingsStore } from "../src/settings";
import type { SecretStore } from "../src/secrets";
import { ConversationAgentManager, SCHEDULED_TIMEOUT_MESSAGE, type ConversationAgentOptions } from "../src/server/conversations";
import { startScheduler } from "../src/server/scheduler";

class MemorySecrets implements SecretStore {
  readonly persistence = "environment-only" as const;
  private values = new Map<string, string>();
  get(name: string) { return this.values.get(name) ?? ""; }
  set(name: string, value: string) { this.values.set(name, value); }
  delete(name: string) { this.values.delete(name); }
}

const model = { api: "openai-completions", provider: "openai", id: "test-model", name: "Test", baseUrl: "https://example.test", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 10000, maxTokens: 1000 } as any;

/** prompt 永不自行返回，只有 abort() 能解开——模拟挂起的模型调用。 */
class HangingAgent {
  state: any = { model, messages: [], errorMessage: undefined };
  signal: AbortSignal | undefined;
  aborts = 0;
  private release: (() => void) | null = null;
  subscribe() { return () => {}; }
  abort() { this.aborts++; this.release?.(); }
  async prompt() { await new Promise<void>((resolve) => { this.release = resolve; }); }
}

const contexts: RecipeDB[] = [];
afterEach(() => { for (const db of contexts.splice(0)) db.close(); });

function setup() {
  const db = new RecipeDB(":memory:");
  contexts.push(db);
  const settings = new SettingsStore(db, new MemorySecrets());
  settings.setModelName("openai");
  settings.setKey("openai", "test-key");
  const created: HangingAgent[] = [];
  const manager = new ConversationAgentManager(db, settings, { getModel: () => model } as any, ((options: ConversationAgentOptions) => {
    const agent = new HangingAgent();
    created.push(agent);
    return agent as any;
  }) as any);
  return { db, manager, created };
}

describe("定时任务超时保护", () => {
  test("模型调用挂起时按超时返回，且提醒本身已落库", async () => {
    const { db, manager, created } = setup();
    const conversationId = db.createConversation("定时提醒");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30);
    const result = await manager.runScheduled(conversationId, { id: 1, title: "喝水", message: "该喝水了" }, { signal: controller.signal });
    clearTimeout(timer);

    expect(result.modelError).toBe(SCHEDULED_TIMEOUT_MESSAGE);
    expect(result.assistantMessageId).toBeUndefined();
    expect(created[0]!.aborts).toBe(1);
    expect(db.getMessages(conversationId, 10).map((m) => m.content).join("\n")).toContain("该喝水了");
  });

  test("超时后丢弃 runtime，挂起的链不再占用该会话", async () => {
    const { db, manager, created } = setup();
    const conversationId = db.createConversation("定时提醒");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30);
    await manager.runScheduled(conversationId, { id: 1, title: "喝水", message: "该喝水了" }, { signal: controller.signal });
    clearTimeout(timer);
    expect(created).toHaveLength(1);

    // 下次访问必须重建 runtime，否则后续对话会被同一条挂起的 chain 永久阻塞
    const immediatelyAborted = new AbortController();
    immediatelyAborted.abort();
    await manager.runScheduled(conversationId, { id: 1, title: "喝水", message: "再来一次" }, { signal: immediatelyAborted.signal });
    expect(created).toHaveLength(2);
  });

  test("单次挂起不会让调度器永久停摆", async () => {
    const { db, manager } = setup();
    const conversationId = db.createConversation("定时提醒");
    const schedule = { id: 7, conversation_id: conversationId, title: "挂起任务", message: "内容", schedule_type: "daily", time_of_day: "00:00", weekdays: null, fire_date: null, enabled: 1, last_fired_at: null, next_fire_at: "2000-01-01 00:00:00", created_at: "", updated_at: "" } as any;
    let dueCalls = 0;
    const dbProxy = {
      dueSchedules: () => { dueCalls++; return [schedule]; },
      markScheduleFired: () => null,
      getSchedule: () => undefined,
      getConversation: (id: number) => db.getConversation(id),
      createConversation: (title: string) => db.createConversation(title),
    } as any;

    const stop = startScheduler(dbProxy, manager, { intervalMs: 30, fireTimeoutMs: 50 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    stop();
    expect(dueCalls).toBeGreaterThan(1);
  });
});
