import {
  createModels,
  createProvider,
  envApiKeyAuth,
  type Model,
} from "@earendil-works/pi-ai";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { googleProvider } from "@earendil-works/pi-ai/providers/google";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import { moonshotaiProvider } from "@earendil-works/pi-ai/providers/moonshotai";
import { minimaxProvider } from "@earendil-works/pi-ai/providers/minimax";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { config, type ModelName } from "./config";
import { ALL_MODELS, type SettingsStore } from "./settings";

const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/";
const CUSTOM_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const CUSTOM_DEFAULT_MODEL = "gpt-4o";

/** 构造一个走 openai-completions 协议的模型定义。 */
function openAICompatModel(
  id: string,
  name: string,
  provider: string,
  baseUrl: string,
): Model<"openai-completions"> {
  return {
    id,
    name,
    api: "openai-completions",
    provider,
    baseUrl,
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 30000,
    maxTokens: 8192,
    // 兼容层普遍用 system 角色，而非 OpenAI 的 developer 角色
    compat: { supportsDeveloperRole: false },
  };
}

/** 注册（或覆盖）「自定义」provider，模型与 baseUrl 由设置决定。空值回落到默认。 */
export function registerCustomProvider(
  models: ModelsCollection,
  baseUrl: string,
  modelId: string,
): void {
  const url = baseUrl.trim() || CUSTOM_DEFAULT_BASE_URL;
  const id = modelId.trim() || CUSTOM_DEFAULT_MODEL;
  models.setProvider(
    createProvider({
      id: "custom",
      name: "自定义",
      baseUrl: url,
      auth: { apiKey: envApiKeyAuth("自定义 API Key", ["CUSTOM_API_KEY"]) },
      models: [openAICompatModel(id, "自定义模型", "custom", url)],
      api: openAICompletionsApi(),
    }),
  );
}

/** 构建包含全部 provider 的 Models 集合。 */
export function buildModels(settings: SettingsStore) {
  const models = createModels();

  // 内置 provider（pi-ai 自带目录）
  models.setProvider(openaiProvider());
  models.setProvider(googleProvider());
  models.setProvider(deepseekProvider());
  models.setProvider(moonshotaiProvider());
  models.setProvider(minimaxProvider());
  models.setProvider(anthropicProvider());

  // 自定义 OpenAI 兼容 provider：通义千问
  models.setProvider(
    createProvider({
      id: "qwen",
      name: "通义千问",
      baseUrl: QWEN_BASE_URL,
      auth: { apiKey: envApiKeyAuth("DashScope API Key", ["DASHSCOPE_API_KEY"]) },
      models: [openAICompatModel(config.qwenModel, "Qwen-VL", "qwen", QWEN_BASE_URL)],
      api: openAICompletionsApi(),
    }),
  );

  // 自定义 OpenAI 兼容 provider：智谱 GLM
  models.setProvider(
    createProvider({
      id: "glm",
      name: "智谱 GLM",
      baseUrl: GLM_BASE_URL,
      auth: { apiKey: envApiKeyAuth("智谱 API Key", ["ZHIPUAI_API_KEY"]) },
      models: [openAICompatModel(config.glmModel, "GLM-4V", "glm", GLM_BASE_URL)],
      api: openAICompletionsApi(),
    }),
  );

  // 自定义（用户填 baseUrl + 模型 ID）
  registerCustomProvider(models, settings.get("custom_base_url"), settings.get("custom_model"));

  return models;
}

export type ModelsCollection = ReturnType<typeof buildModels>;

const BUILTIN_MAPPING: Record<Exclude<ModelName, "custom">, [string, string]> = {
  openai: ["openai", config.openaiModel],
  gemini: ["google", config.geminiModel],
  deepseek: ["deepseek", config.deepseekModel],
  moonshot: ["moonshotai", config.moonshotModel],
  minimax: ["minimax", config.minimaxModel],
  anthropic: ["anthropic", config.anthropicModel],
  qwen: ["qwen", config.qwenModel],
  glm: ["glm", config.glmModel],
};

/** 按模型名查模型（不校验 key）。 */
export function getModelByName(
  models: ModelsCollection,
  settings: SettingsStore,
  name: ModelName,
): Model<any> {
  if (name === "custom") {
    const id = settings.get("custom_model") || CUSTOM_DEFAULT_MODEL;
    const model = models.getModel("custom", id);
    if (!model) {
      throw new Error(`未找到自定义模型 ${id}，请检查 Base URL 与模型 ID`);
    }
    return model;
  }
  const [provider, id] = BUILTIN_MAPPING[name];
  const model = models.getModel(provider, id);
  if (!model) {
    throw new Error(`未找到模型 ${provider}/${id}，请检查模型配置`);
  }
  return model;
}

/** 启动时打印各 provider 是否已配置。 */
export function describeProviders(settings: SettingsStore): string[] {
  return ALL_MODELS.map((n) => `${n}: ${settings.getKey(n) ? "已配置" : "未配置"}`);
}
