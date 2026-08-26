import type { Agent } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";
import { config } from "./config";
import { buildModels, getModelByName, describeProviders } from "./models";
import { RecipeDB } from "./db/database";
import { SettingsStore } from "./settings";
import { createAgent } from "./agent";
import { startServer } from "./server/server";

const db = new RecipeDB(config.databasePath);
const settings = new SettingsStore(db);

console.log("💪 健康管家启动中…");
console.log("模型配置：");
for (const line of describeProviders(settings)) {
  console.log(`  · ${line}`);
}

const models = buildModels(settings);

// 初始模型：只按名字查，不校验 key（用户可在网页设置中心补 key）。
let initialModel: Model<any>;
try {
  initialModel = getModelByName(models, settings, settings.getModelName());
} catch {
  initialModel = models.getModel("openai", config.openaiModel)!;
}
console.log(`当前使用模型：${settings.getModelName()} (${initialModel.provider}/${initialModel.id})`);
if (!settings.getKey(settings.getModelName())) {
  console.warn("⚠️ 当前模型缺少 API Key，请在网页右上角设置中心填写后使用。");
}

let agent: Agent;
const getModel = () => agent.state.model;
agent = createAgent(db, models, getModel, initialModel);

startServer(agent, db, settings, models);
