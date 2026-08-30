import { Agent } from "@earendil-works/pi-agent-core";
import type { Models, Model } from "@earendil-works/pi-ai";
import type { RecipeDB } from "./db/database";
import { SYSTEM_PROMPT } from "./system-prompt";
import { createAllTools } from "./tools";
import type { AgentActionProposal, Message } from "./db/database";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { buildSkillSection, DEFAULT_ENABLED_SKILL_IDS } from "./skills";

export function restoreAgentMessages(messages: Message[], model: Model<any>): AgentMessage[] {
  return messages.flatMap((message): AgentMessage[] => {
    const timestamp = Date.parse(message.created_at) || Date.now();
    if (message.role === "user") return [{ role: "user", content: message.content, timestamp }];
    if (message.role !== "assistant") return [];
    return [{
      role: "assistant",
      content: [{ type: "text", text: message.content }],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "stop",
      timestamp,
    }];
  });
}

/** 组装健康管家 Agent。getModel 返回当前模型，供子调用工具读取（支持运行时切换）。 */
export function createAgent(
  db: RecipeDB,
  models: Models,
  getModel: () => Model<any>,
  model: Model<any>,
  options: {
    conversationId?: number;
    restoredMessages?: Message[];
    getApiKey?: (provider: string) => string | undefined;
    onProposal?: (proposal: AgentActionProposal) => void;
    /** 启用的技能 id 列表；省略时启用全部（保持原有行为）。 */
    enabledSkillIds?: string[];
    /** 会话亲和 id：转发给支持缓存的 provider，提升多轮对话的缓存命中。 */
    sessionId?: string;
    /** 运行时设置；提供后注册百度地图等外部服务工具。 */
    settings?: import("./settings").SettingsStore;
  } = {},
): Agent {
  const enabledIds = options.enabledSkillIds ?? DEFAULT_ENABLED_SKILL_IDS;
  const skillSection = buildSkillSection(enabledIds);
  const systemPrompt = skillSection
    ? `${SYSTEM_PROMPT}\n\n${skillSection}`
    : SYSTEM_PROMPT;
  const tools = createAllTools(db, models, getModel, options);
  const baseStreamFn = models.streamSimple.bind(models);
  // 会话级 prompt 缓存：sessionId 提供会话亲和，cacheRetention 请求短期缓存；
  // 不支持的 provider 会按各自的 compat 语义忽略，因此始终透传是安全的。
  const streamFn: typeof baseStreamFn = options.sessionId
    ? (m, context, opts) => baseStreamFn(m, context, { ...opts, sessionId: options.sessionId, cacheRetention: "short" })
    : baseStreamFn;
  return new Agent({
    initialState: {
      systemPrompt,
      model,
      tools,
      messages: restoreAgentMessages(options.restoredMessages ?? [], model),
    },
    streamFn,
    getApiKey: options.getApiKey,
    transformContext: async (messages) => messages.slice(-40),
  });
}
