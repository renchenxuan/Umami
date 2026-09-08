import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { SettingsStore } from "../src/settings";
import type { SecretStore } from "../src/secrets";
import { ConversationAgentManager, MAX_RUNTIMES, type ConversationAgentOptions } from "../src/server/conversations";

class MemorySecrets implements SecretStore {
  readonly persistence = "environment-only" as const;
  private values = new Map<string, string>();
  get(name: string) { return this.values.get(name) ?? ""; }
  set(name: string, value: string) { this.values.set(name, value); }
  delete(name: string) { this.values.delete(name); }
}

const model = { api: "openai-completions", provider: "openai", id: "test-model", name: "Test", baseUrl: "https://example.test", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 10000, maxTokens: 1000 } as any;

class IdleAgent {
  state: any = { model, messages: [], errorMessage: undefined };
  subscribe() { return () => {}; }
  abort() {}
  async prompt() {}
}

const contexts: RecipeDB[] = [];
afterEach(() => { for (const db of contexts.splice(0)) db.close(); });

function setup() {
  const db = new RecipeDB(":memory:");
  contexts.push(db);
  const settings = new SettingsStore(db, new MemorySecrets());
  settings.setModelName("openai");
  settings.setKey("openai", "test-key");
  const created: IdleAgent[] = [];
  const manager = new ConversationAgentManager(db, settings, { getModel: () => model } as any, ((options: ConversationAgentOptions) => {
    const agent = new IdleAgent();
    created.push(agent);
    return agent as any;
  }) as any);
  return { db, manager, created };
}

describe("会话 runtime 回收", () => {
  test("超过上限后淘汰最久未使用的会话，窗口内的会话继续复用", async () => {
    const { db, manager, created } = setup();
    const ids = Array.from({ length: MAX_RUNTIMES + 1 }, (_, i) => db.createConversation(`会话${i}`));
    for (const id of ids) await manager.runScheduled(id, { id: 1, title: "提醒", message: "内容" } );
    expect(created).toHaveLength(MAX_RUNTIMES + 1);

    // 最早的会话已被淘汰 → 需要重建
    await manager.runScheduled(ids[0]!, { id: 1, title: "提醒", message: "内容" });
    expect(created).toHaveLength(MAX_RUNTIMES + 2);

    // 仍在窗口内的会话命中缓存 → 不新建
    await manager.runScheduled(ids[MAX_RUNTIMES]!, { id: 1, title: "提醒", message: "内容" });
    expect(created).toHaveLength(MAX_RUNTIMES + 2);
  });
});
