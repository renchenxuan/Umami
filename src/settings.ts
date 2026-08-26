import { config, type ModelName } from "./config";
import type { RecipeDB } from "./db/database";

export const ALL_MODELS: ModelName[] = [
  "openai",
  "gemini",
  "deepseek",
  "moonshot",
  "minimax",
  "anthropic",
  "qwen",
  "glm",
  "custom",
];

/**
 * 每家 provider 对应的 settings key，以及需要同步的环境变量。
 * 注意：pi-ai 的 google provider 读 GEMINI_API_KEY；moonshot 读 MOONSHOT_API_KEY 等。
 */
const PROVIDER_CONFIG: Record<ModelName, { settingsKey: string; envVars: string[] }> = {
  openai: { settingsKey: "openai_api_key", envVars: ["OPENAI_API_KEY"] },
  gemini: { settingsKey: "google_api_key", envVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] },
  deepseek: { settingsKey: "deepseek_api_key", envVars: ["DEEPSEEK_API_KEY"] },
  moonshot: { settingsKey: "moonshot_api_key", envVars: ["MOONSHOT_API_KEY"] },
  minimax: { settingsKey: "minimax_api_key", envVars: ["MINIMAX_API_KEY"] },
  anthropic: { settingsKey: "anthropic_api_key", envVars: ["ANTHROPIC_API_KEY"] },
  qwen: { settingsKey: "dashscope_api_key", envVars: ["DASHSCOPE_API_KEY"] },
  glm: { settingsKey: "zhipu_api_key", envVars: ["ZHIPUAI_API_KEY"] },
  custom: { settingsKey: "custom_api_key", envVars: ["CUSTOM_API_KEY"] },
};

// 需要持久化/播种的所有设置项（key 字段 + 自定义端点字段）
const SEEDS: Record<string, string> = {
  model_name: config.modelName,
  openai_api_key: config.openaiApiKey,
  google_api_key: config.googleApiKey,
  deepseek_api_key: config.deepseekApiKey,
  moonshot_api_key: config.moonshotApiKey,
  minimax_api_key: config.minimaxApiKey,
  anthropic_api_key: config.anthropicApiKey,
  dashscope_api_key: config.dashscopeApiKey,
  zhipu_api_key: config.zhipuApiKey,
  custom_api_key: config.customApiKey,
  custom_base_url: config.customBaseUrl,
  custom_model: config.customModel,
};

/**
 * 运行时设置：内存 + SQLite 双写，key 类设置同步到 process.env 供 pi-ai 读取。
 */
export class SettingsStore {
  private cache = new Map<string, string>();

  constructor(private db: RecipeDB) {
    this.load();
  }

  private load(): void {
    for (const [key, envVal] of Object.entries(SEEDS)) {
      const dbVal = this.db.getSetting(key);
      const value = dbVal !== undefined && dbVal !== "" ? dbVal : envVal || "";
      this.cache.set(key, value);
      if (dbVal === undefined) this.db.setSetting(key, value);
    }
    this.syncEnv();
  }

  private syncEnv(): void {
    for (const provider of ALL_MODELS) {
      const { settingsKey, envVars } = PROVIDER_CONFIG[provider];
      const value = this.cache.get(settingsKey) ?? "";
      for (const envVar of envVars) {
        process.env[envVar] = value;
      }
    }
  }

  get(key: string): string {
    return this.cache.get(key) ?? "";
  }

  set(key: string, value: string): void {
    this.cache.set(key, value);
    this.db.setSetting(key, value);
    this.syncEnv();
  }

  getModelName(): ModelName {
    const v = this.get("model_name");
    return (ALL_MODELS as string[]).includes(v) ? (v as ModelName) : "openai";
  }

  getKey(provider: ModelName): string {
    return this.get(PROVIDER_CONFIG[provider].settingsKey);
  }

  setModelName(name: ModelName): void {
    this.set("model_name", name);
  }

  setKey(provider: ModelName, key: string): void {
    this.set(PROVIDER_CONFIG[provider].settingsKey, key);
  }

  overview() {
    const hasKey = {} as Record<ModelName, boolean>;
    for (const m of ALL_MODELS) hasKey[m] = !!this.getKey(m);
    return {
      modelName: this.getModelName(),
      hasKey,
      availableModels: ALL_MODELS,
      custom: {
        baseUrl: this.get("custom_base_url"),
        model: this.get("custom_model"),
      },
    };
  }
}
