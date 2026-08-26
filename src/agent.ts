import { Agent } from "@earendil-works/pi-agent-core";
import type { Models, Model } from "@earendil-works/pi-ai";
import type { RecipeDB } from "./db/database";
import { SYSTEM_PROMPT } from "./system-prompt";
import { createAllTools } from "./tools";

/** 组装健康管家 Agent。getModel 返回当前模型，供子调用工具读取（支持运行时切换）。 */
export function createAgent(
  db: RecipeDB,
  models: Models,
  getModel: () => Model<any>,
  model: Model<any>,
): Agent {
  const tools = createAllTools(db, models, getModel);
  return new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools,
    },
    streamFn: models.streamSimple.bind(models),
  });
}
