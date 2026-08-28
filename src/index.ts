import type { Agent } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";
import { config } from "./config";
import { buildModels, getModelByName, describeProviders } from "./models";
import { RecipeDB } from "./db/database";
import { SettingsStore } from "./settings";
import { createAgent } from "./agent";
import { startServer } from "./server/server";
import { validateCustomBaseUrl } from "./server/api";
import { unsafeCustomEndpointsEnabled } from "./config";

const db = new RecipeDB(config.databasePath);
const settings = new SettingsStore(db);

console.log("🏠 膳待家启动中…");
console.log("模型配置：");
for (const line of describeProviders(settings)) {
  console.log(`  · ${line}`);
}

const configuredCustomUrl=settings.get("custom_base_url");
const customEndpointsEnabled=unsafeCustomEndpointsEnabled();
const customUrlIsSafe=customEndpointsEnabled&&!!configuredCustomUrl&&await validateCustomBaseUrl(configuredCustomUrl);
if(configuredCustomUrl&&!customEndpointsEnabled)console.warn("⚠️ 自定义模型端点默认禁用；仅在明确接受 SSRF/重定向风险后设置 ALLOW_UNSAFE_CUSTOM_ENDPOINTS=true 才会加载。");
if(customEndpointsEnabled&&configuredCustomUrl&&!customUrlIsSafe)console.warn("⚠️ 已保存的自定义模型地址解析到本机或私有网络，本次启动不会加载该 Provider。");
const models = buildModels(settings,customUrlIsSafe?configuredCustomUrl:null,customEndpointsEnabled);

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

startServer(agent, db, settings, models, {
  conversationAgentFactory: ({ conversationId, model, getApiKey, onProposal }) => {
    let conversationAgent: Agent;
    const enabledSkillIds = settings.getEnabledSkills();
    conversationAgent = createAgent(db, models, () => conversationAgent.state.model, model, {
      conversationId,
      getApiKey,
      onProposal,
      enabledSkillIds,
    });
    return conversationAgent;
  },
});
