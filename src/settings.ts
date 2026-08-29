import { config, unsafeCustomEndpointsEnabled, type ModelName } from "./config";
import type { RecipeDB } from "./db/database";
import { createSecretStore, type SecretStore } from "./secrets";
import { DEFAULT_ENABLED_SKILL_IDS } from "./skills";

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

/** 可选的推理强度；转发给 Agent 的 thinkingLevel，仅对支持推理的模型生效。 */
export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high"] as const;
export type ThinkingLevelSetting = (typeof THINKING_LEVELS)[number];

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
  custom_base_url: config.customBaseUrl,
  custom_model: config.customModel,
};

/**
 * 运行时设置：内存 + SQLite 双写，key 类设置同步到 process.env 供 pi-ai 读取。
 */
export class SettingsStore {
  private cache = new Map<string, string>();

  constructor(private db: RecipeDB, private secrets: SecretStore = createSecretStore()) {
    this.load();
  }

  private load(): void {
    for (const [key, envVal] of Object.entries(SEEDS)) {
      const dbVal = this.db.getSetting(key);
      const value = dbVal !== undefined && dbVal !== "" ? dbVal : envVal || "";
      this.cache.set(key, value);
      if (dbVal === undefined) this.db.setSetting(key, value);
    }
    for (const provider of ALL_MODELS) {
      const { settingsKey, envVars } = PROVIDER_CONFIG[provider];
      const legacy = this.db.getSetting(settingsKey) ?? "";
      let stored = "";
      let readFailed = false;
      for (const name of envVars) {
        try {
          stored ||= this.secrets.get(name);
        } catch (error) {
          readFailed = true;
          console.warn(`无法读取 ${settingsKey} 的安全凭据，SQLite 原值将保留：`, error instanceof Error ? error.message : "unknown error");
        }
      }

      let value = stored || legacy;
      if (legacy && this.secrets.persistence !== "environment-only" && !readFailed) {
        try {
          if (stored && stored !== legacy) {
            throw new Error("credential conflict");
          }
          if (!stored) {
            const target = envVars[0]!;
            this.secrets.set(target, legacy);
            if (this.secrets.get(target) !== legacy) throw new Error("credential verification failed");
            stored = legacy;
            value = legacy;
          }
          // Delete only after the exact legacy value has been read back from durable storage.
          if (stored !== legacy) throw new Error("credential verification failed");
          this.db.deleteSecretSettingEverywhere(settingsKey);
        } catch (error) {
          console.warn(`无法安全迁移 ${settingsKey}，SQLite 原值已保留：`, error instanceof Error ? error.message : "unknown error");
        }
      }
      this.cache.set(settingsKey, value);
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
    if (Object.values(PROVIDER_CONFIG).some((entry) => entry.settingsKey === key)) {
      throw new Error("Use setKey() for secret values");
    }
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

  getModelOverride(name: ModelName): string {
    return this.get(name + "_model");
  }

  setModelOverride(name: ModelName, id: string): void {
    this.set(name + "_model", id);
  }

  setKey(provider: ModelName, key: string): void {
    const { settingsKey, envVars } = PROVIDER_CONFIG[provider];
    const previous = new Map<string, string>();
    for (const envVar of envVars) previous.set(envVar, this.secrets.get(envVar));
    try {
      for (const envVar of envVars) {
        if (key) this.secrets.set(envVar, key);
        else this.secrets.delete(envVar);
        if (this.secrets.get(envVar) !== key) throw new Error("credential verification failed");
      }
    } catch (error) {
      for (const [envVar, value] of previous) {
        try {
          if (value) this.secrets.set(envVar, value);
          else this.secrets.delete(envVar);
        } catch {
          // Preserve the original error; recovery is best-effort.
        }
      }
      throw error;
    }
    if (this.secrets.persistence === "windows-credential-manager") {
      this.db.deleteSecretSettingEverywhere(settingsKey);
    }
    this.cache.set(settingsKey, key);
    this.syncEnv();
  }

  getSecretValues(): string[] {
    return ALL_MODELS.map((provider) => this.getKey(provider)).filter(Boolean);
  }

  /** 用户已启用的技能 id 集合；默认全部启用，关闭的才存入「已禁用」集合。 */
  getEnabledSkills(): string[] {
    const raw = this.cache.get("disabled_skills");
    let disabled: string[] = [];
    if (raw !== undefined) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) disabled = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        /* 损坏值按空处理 */
      }
    }
    const disabledSet = new Set(disabled);
    return DEFAULT_ENABLED_SKILL_IDS.filter((id) => !disabledSet.has(id));
  }

  /** 写入已启用技能集合（入参为启用列表；内部转换为「已禁用」集合存储，使新技能默认启用）。 */
  setEnabledSkills(ids: string[]): void {
    const enabled = new Set(ids.filter((id) => DEFAULT_ENABLED_SKILL_IDS.includes(id)));
    const disabled = DEFAULT_ENABLED_SKILL_IDS.filter((id) => !enabled.has(id));
    this.set("disabled_skills", JSON.stringify(disabled));
  }

  overview() {
    const customEndpointsEnabled = unsafeCustomEndpointsEnabled();
    const hasKey = {} as Record<ModelName, boolean>;
    for (const m of ALL_MODELS) hasKey[m] = !!this.getKey(m);
    return {
      modelName: this.getModelName(),
      hasKey,
      availableModels: ALL_MODELS,
      custom: {
        baseUrl: this.get("custom_base_url"),
        model: this.get("custom_model"),
        enabled: customEndpointsEnabled,
        safety: customEndpointsEnabled ? "unsafe_opt_in" : "disabled_by_default",
        optInEnvironmentVariable: "ALLOW_UNSAFE_CUSTOM_ENDPOINTS",
      },
      secretPersistence: this.secrets.persistence,
      modelConfigured: !!this.getKey(this.getModelName()),
      uiTheme: this.get("ui_theme") || "aurora",
      thinkingLevel: this.getThinkingLevel(),
    };
  }

  setUiTheme(value: string) {
    if (value !== "light" && value !== "dark" && value !== "aurora") throw new Error("无效的界面主题");
    this.set("ui_theme", value);
  }

  getThinkingLevel(): ThinkingLevelSetting {
    const v = this.get("thinking_level");
    return (THINKING_LEVELS as readonly string[]).includes(v) ? (v as ThinkingLevelSetting) : "off";
  }

  setThinkingLevel(level: string): void {
    if (!(THINKING_LEVELS as readonly string[]).includes(level)) throw new Error("无效的推理强度");
    this.set("thinking_level", level);
  }
}
