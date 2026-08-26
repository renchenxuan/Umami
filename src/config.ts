/**
 * 应用配置：从 .env 读取模型、API Key、端口与数据库路径。
 * Bun 会自动加载 .env，此处直接读 process.env。
 * 运行时模型切换与 key 填写在网页设置中心完成（见 src/settings.ts）。
 */

export type ModelName =
  | "openai"
  | "gemini"
  | "deepseek"
  | "moonshot"
  | "minimax"
  | "anthropic"
  | "qwen"
  | "glm"
  | "custom";

export interface AppConfig {
  modelName: ModelName;
  port: number;
  databasePath: string;
  // API Keys（初始种子，可被设置中心覆盖）
  openaiApiKey: string;
  googleApiKey: string;
  deepseekApiKey: string;
  moonshotApiKey: string;
  minimaxApiKey: string;
  anthropicApiKey: string;
  dashscopeApiKey: string;
  zhipuApiKey: string;
  customApiKey: string;
  // 各 provider 的默认模型 ID
  openaiModel: string;
  geminiModel: string;
  deepseekModel: string;
  moonshotModel: string;
  minimaxModel: string;
  anthropicModel: string;
  qwenModel: string;
  glmModel: string;
  // 自定义 OpenAI 兼容端点
  customBaseUrl: string;
  customModel: string;
}

const modelName = (process.env.MODEL_NAME ?? "openai") as ModelName;

export const config: AppConfig = {
  modelName,
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? "recipe_manager.db",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  googleApiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  moonshotApiKey: process.env.MOONSHOT_API_KEY ?? "",
  minimaxApiKey: process.env.MINIMAX_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY ?? "",
  zhipuApiKey: process.env.ZHIPUAI_API_KEY ?? "",
  customApiKey: process.env.CUSTOM_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
  moonshotModel: process.env.MOONSHOT_MODEL ?? "kimi-k2.5",
  minimaxModel: process.env.MINIMAX_MODEL ?? "MiniMax-M2.7",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  qwenModel: process.env.QWEN_MODEL ?? "qwen-vl-plus",
  glmModel: process.env.GLM_MODEL ?? "glm-4v-plus",
  customBaseUrl: process.env.CUSTOM_BASE_URL ?? "",
  customModel: process.env.CUSTOM_MODEL ?? "",
};
