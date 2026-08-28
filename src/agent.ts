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
  } = {},
): Agent {
  const enabledIds = options.enabledSkillIds ?? DEFAULT_ENABLED_SKILL_IDS;
  const skillSection = buildSkillSection(enabledIds);
  const systemPrompt = skillSection
    ? `${SYSTEM_PROMPT}\n\n${skillSection}`
    : SYSTEM_PROMPT;
  const tools = createAllTools(db, models, getModel, options);
  return new Agent({
    initialState: {
      systemPrompt,
      model,
      tools,
      messages: restoreAgentMessages(options.restoredMessages ?? [], model),
    },
    streamFn: models.streamSimple.bind(models),
    getApiKey: options.getApiKey,
    transformContext: async (messages) => messages.slice(-40),
  });
}
